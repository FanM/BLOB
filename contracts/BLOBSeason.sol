// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.6;

import './BLOBLeague.sol';
import './BLOBPlayer.sol';
import './BLOBRegistry.sol';
import './BLOBTeam.sol';
import './BLOBMatch.sol';
import './BLOBUtils.sol';

contract BLOBSeason is WithRegistry {

    enum SeasonState {
      ACTIVE,
      ENDSEASON,
      DRAFT,
      OFFSEASON
    }

    event MatchStats (
        uint timestamp,
        uint  matchId,
        uint  seasonId,
        uint8 matchRound,
        uint8 hostTeam,
        uint8 guestTeam,
        uint8 hostScore,
        uint8 guestScore,
        uint8 overtimeCount,
        bool hostForfeit,
        bool guestForfeit
    );

    event DraftPick(
      uint seasonId,
      uint playerId,
      uint8 draftRound,
      uint8 draftPick,
      uint8 teamId
    );

    using Percentage for uint8;
    using ArrayLib for uint8[];

    // season state
    SeasonState public seasonState = SeasonState.OFFSEASON;

    // season id
    uint public seasonId;

    // max rounds for a season
    uint8 public maxMatchRounds;

    // match round
    uint8 public matchRound = 1;

    // match index within a matchRound
    uint public matchIndex;

    // match list
    BLOBMatch.MatchInfo[] public matchList;

    // draft pool
    // only active in the pre-season, once season starts,
    // unpicked players go to the undrafted pool.
    uint[] public draftPlayerIds;

    // undrafted players, can be picked up through the season
    uint[] public undraftedPlayerIds;

    // the ranking of teams in the previous season
    uint8[] public teamRanking;

    // start timestamp for current pick
    uint public currentPickStartTime;

    // the current order in the reverse ranking list to pick player
    uint8 public currentPickOrder;

    // the draft round
    uint8 public draftRound;

    // the number of game played and won each team has,
    // used to track team ranking
    mapping(uint8=>uint8[2]) public teamWins;
    // the +/- of team cumulative wins/loss, used to track team momentum
    mapping(uint8=>int8) public teamMomentum;
    // season Id to champion team id
    mapping (uint=>uint8) public seasonToChampion;


    // other contracts
    BLOBPlayer PlayerContract;
    BLOBTeam TeamContract;
    BLOBMatch MatchContract;

    constructor(address _registryContractAddr)
        WithRegistry(_registryContractAddr) {}

    modifier inState(SeasonState state) {
      require(
        state == seasonState,
        uint8(BLOBLeague.ErrorCode.INVALID_SEASON_STATE).toStr()
      );
      _;
    }

    function Init() external leagueOnly {
      PlayerContract = BLOBPlayer(RegistryContract.PlayerContract());
      TeamContract = BLOBTeam(RegistryContract.TeamContract());
      MatchContract = BLOBMatch(RegistryContract.MatchContract());
    }

    function PlayMatch() external leagueOnly inState(SeasonState.ACTIVE) {
      require(
        matchIndex < matchList.length,
        uint8(BLOBLeague.ErrorCode.SEASON_END_OF_MATCH_LIST).toStr()
      );

      uint seed = playMatchAndUpdateResult(block.timestamp);
      if (matchIndex+1 < matchList.length) {
        if (matchRound != matchList[matchIndex+1].matchRound) {
          // we are at the end of the current round
          matchRound++;
          require(
            matchRound == matchList[matchIndex+1].matchRound,
            uint8(BLOBLeague.ErrorCode.SEASON_MATCH_ROUND_OUT_OF_ORDER).toStr()

          );
        }
      } else {
        // reaches the end of current season
        endSeason(seed);
      }

      matchIndex++;
    }

    function StartSeason() external leagueOnly inState(SeasonState.OFFSEASON) {
      // clears previous season's schedules
      delete matchList;
      uint8 teamCount = TeamContract.teamCount();
      if (teamCount < 2)
        revert(uint8(BLOBLeague.ErrorCode.SEASON_NOT_ENOUGH_TEAMS).toStr());
      for (uint8 i=0; i<teamCount; i++) {
        teamWins[i] = [0, 0];
        teamMomentum[i] = 0;
      }
      seasonId++;
      // generate match list
      scheduleGamesForSeason(teamCount);
      matchRound  = 1;
      matchIndex = 0;
      seasonState = SeasonState.ACTIVE;
    }

    function endSeason(uint seed) private inState(SeasonState.ACTIVE) {
      // gets season champion
      uint8 championTeamId = GetTeamRanking()[0];
      seasonToChampion[seasonId] = championTeamId;
      TeamContract.IncrementTeamChampionCount(championTeamId);

      // increment player age, physical strength and salaries
      PlayerContract.UpdatePlayerConditions(maxMatchRounds, seed);

      // update team salaries
      for(uint8 i=0; i<TeamContract.teamCount(); i++) {
        TeamContract.UpdateTeamTotalSalary(i);
      }

      // for each position, we create one player for each team to pick up
      uint8 teamCount = TeamContract.teamCount();
      for (uint8 i=0; i<5; i++) {
        uint[] memory newPlayerIds = PlayerContract.MintPlayersForDraft(
                                            BLOBPlayer.Position(i), teamCount);
        for (uint8 j=0; j<newPlayerIds.length; j++)
          draftPlayerIds.push(newPlayerIds[j]);
      }
      seasonState = SeasonState.ENDSEASON;
    }

    // rank teams based on win percentage in descending order
    function GetTeamRanking()
        public view returns(uint8[] memory ranking) {
      uint8 teamCount = TeamContract.teamCount();
      uint8[] memory teamWinPcts = new uint8[](teamCount);
      for (uint8 i=0; i<teamCount; i++) {
        if (teamWins[i][0] > 0) {
          teamWinPcts[i] = teamWins[i][1].dividePct(teamWins[i][0]);
        } else {
          teamWinPcts[i] = 0;
        }
      }
      // sort
      ranking = teamWinPcts.sortIndexDesc();
    }

    function GetMatchList() external view returns (BLOBMatch.MatchInfo[] memory) {
      return matchList;
    }

    function StartDraft() external leagueOnly inState(SeasonState.ENDSEASON) {
      require(
        currentPickStartTime == 0,
        uint8(BLOBLeague.ErrorCode.ALREADY_IN_DRAFT).toStr()
      );
      teamRanking = GetTeamRanking();
      currentPickStartTime = block.timestamp;
      draftRound = 1;
      currentPickOrder = 0; // the first one first
      seasonState = SeasonState.DRAFT;
    }

    function EndDraft() external leagueOnly inState(SeasonState.DRAFT) {
      for (uint i=0; i<draftPlayerIds.length; i++) {
        undraftedPlayerIds.push(draftPlayerIds[i]);
      }
      delete draftPlayerIds;
      delete teamRanking;
      currentPickStartTime = 0;
      seasonState = SeasonState.OFFSEASON;
    }

    function GetDraftPlayerList()
        external view returns(uint[] memory) {
      return draftPlayerIds;
    }

    function GetUndraftedPlayerList()
        external view returns(uint[] memory) {
      return undraftedPlayerIds;
    }

    function CheckAndPickDraftPlayer(uint _playerId, uint8 _teamId)
        external inState(SeasonState.DRAFT) teamOnly {
      // checks if it's already passed the time limit for current pick,
      // as we need to advance the draft round and pick even if some teams
      // give up their picks
      uint timeSpan = (block.timestamp - currentPickStartTime);
      while (timeSpan > teamRanking.length * 10 minutes) {
        timeSpan -= teamRanking.length * 10 minutes;
        draftRound++;
      }
      while (timeSpan > 10 minutes) {
        timeSpan -= 10 minutes;
        currentPickOrder++;
        if (currentPickOrder == uint8(teamRanking.length)) {
          currentPickOrder = 0;
          draftRound++;
        }
      }

      uint8 playerCount = TeamContract.teamCount() * 5;
      for(uint i=0; i<draftPlayerIds.length; i++) {
        if (_playerId == draftPlayerIds[i]) {
          uint8 currentTeamToPick =
                  teamRanking[teamRanking.length - currentPickOrder - 1];

          // each team has 10 minutes in deciding which player they want to pick
          require(
            currentTeamToPick == _teamId,
            uint8(BLOBLeague.ErrorCode.DRAFT_INVALID_PICK_ORDER).toStr()
          );
          // removes playerId from draft player list
          draftPlayerIds[i] = draftPlayerIds[draftPlayerIds.length-1];
          draftPlayerIds.pop();
          emit DraftPick(
            seasonId,
            _playerId,
            draftRound,
            playerCount - uint8(draftPlayerIds.length),
            _teamId);
          // advances the currentPickOrder to avoid the same team picks again
          // in the same time slot
          currentPickOrder++;
          if (currentPickOrder == uint8(teamRanking.length)) {
            currentPickOrder = 0;
            draftRound++;
          }
          currentPickStartTime = block.timestamp;
          return;
        }
      }
      revert(uint8(BLOBLeague.ErrorCode.PLAYER_NOT_ELIGIBLE_FOR_DRAFT).toStr());
    }

    function PickUndraftPlayer(uint _playerId)
        external teamOnly {
      for(uint i=0; i<undraftedPlayerIds.length; i++) {
        if (_playerId == undraftedPlayerIds[i]) {
          undraftedPlayerIds[i] = undraftedPlayerIds[undraftedPlayerIds.length-1];
          undraftedPlayerIds.pop();
          return;
        }
      }
      revert(uint8(BLOBLeague.ErrorCode.INVALID_PLAYER_ID).toStr());
    }

    function scheduleGamesForSeason(uint8 _teamCount) private {
      // schedules round-robin games for each team
      // adopts the paring table from:
      // https://en.wikipedia.org/wiki/Round-robin_tournament
      // for easier assessing player's next available round, a bye is not
      // allowed, thus requires team count be even
      require(
        (_teamCount % 2) == 0,
        uint8(BLOBLeague.ErrorCode.SEASON_TEAM_COUNT_NOT_EVEN).toStr()
      );
      uint8 n = _teamCount;
      maxMatchRounds = n - 1;
      uint8 cols = n / 2;
      uint8[][] memory gameTable = new uint8[][](maxMatchRounds);
      uint8 teamIndex = 0;
      for (uint8 i=0; i<maxMatchRounds; i++) {
        uint8[] memory gameRow = new uint8[](cols);
        for (uint8 j=0; j<cols; j++) {
          gameRow[j] = teamIndex;
          teamIndex = (teamIndex + 1) % (n-1);
        }
        gameTable[i] = gameRow;
      }
      uint matchId  = 1;
      for (uint8 i=0; i<maxMatchRounds; i++) {
        uint8[] memory opponents = new uint8[](cols);
        for (uint8 j=0; j<cols; j++) {
          opponents[j] = gameTable[(i+1) % maxMatchRounds][cols-j-1];
          if (opponents[j] == gameTable[i][j]) {
            matchList.push(
              BLOBMatch.MatchInfo(
                matchId++,        // match id
                seasonId,         // season id
                i + 1,            // match round
                gameTable[i][j],  // host team id
                n - 1,            // guest team id
                0,                // host team score
                0,                // guest team score
                0,                // overtime count
                false,            // host forfeit
                false             // guest forfeit
              )
            );
          } else {
            matchList.push(
              BLOBMatch.MatchInfo(
                matchId++,        // match id
                seasonId,         // season id
                i + 1,            // match round
                gameTable[i][j],  // host team id
                opponents[j],     // guest team id
                0,                // host team score
                0,                // guest team score
                0,                // overtime count
                false,            // host forfeit
                false             // guest forfeit
              )
            );
          }
        }
      }
      // schedule again by swapping host and guest
      uint curEnd = matchId - 1;
      for (uint i=0; i<curEnd; i++) {
        BLOBMatch.MatchInfo memory matchInfo = matchList[i];
        matchInfo.matchId = matchId++;
        matchInfo.matchRound += maxMatchRounds;
        uint8 curHost = matchInfo.hostTeam;
        matchInfo.hostTeam = matchInfo.guestTeam;
        matchInfo.guestTeam = curHost;
        matchList.push(matchInfo);
      }
      maxMatchRounds *= 2;
      assert(matchList.length == matchId - 1);
    }

    function playMatchAndUpdateResult(uint _seed)
        private returns(uint seed) {

      BLOBMatch.MatchInfo storage matchInfo = matchList[matchIndex];
      assert(matchInfo.hostTeam != matchInfo.guestTeam);

      uint8 hostScore;
      uint8 guestScore;
      bool canHostPlay =
        MatchContract.ValidateTeamPlayerGameTime(matchInfo.hostTeam) ==
          BLOBLeague.ErrorCode.OK;
      bool canGuestPlay =
        MatchContract.ValidateTeamPlayerGameTime(matchInfo.guestTeam) ==
          BLOBLeague.ErrorCode.OK;
      if (!canHostPlay)
        matchInfo.hostForfeit = true;
      if (!canGuestPlay)
        matchInfo.guestForfeit = true;

      if (canHostPlay || canGuestPlay) {
        uint8 overtimeCount = 0;
        (hostScore, guestScore, seed) =
          MatchContract.PlayMatch(matchInfo, overtimeCount, _seed);
        while (hostScore == guestScore) {
          uint8 hostScoreOT;
          uint8 guestScoreOT;
          (hostScoreOT, guestScoreOT, seed) =
            MatchContract.PlayMatch(matchInfo, overtimeCount++, seed);
          hostScore += hostScoreOT;
          guestScore += guestScoreOT;
        }
        matchInfo.hostScore = hostScore;
        matchInfo.guestScore = guestScore;
        matchInfo.overtimeCount = overtimeCount;
      }

      emit MatchStats(
        block.timestamp,
        matchInfo.matchId,
        matchInfo.seasonId,
        matchInfo.matchRound,
        matchInfo.hostTeam,
        matchInfo.guestTeam,
        matchInfo.hostScore,
        matchInfo.guestScore,
        matchInfo.overtimeCount,
        matchInfo.hostForfeit,
        matchInfo.guestForfeit
      );

      // increment games played
      teamWins[matchInfo.hostTeam][0]++;
      teamWins[matchInfo.guestTeam][0]++;
      if (hostScore > guestScore) {
        updateTeamMomentum(matchInfo.hostTeam, matchInfo.guestTeam);
        // increment games won
        teamWins[matchInfo.hostTeam][1]++;
      } else if (hostScore < guestScore) {
        updateTeamMomentum(matchInfo.guestTeam, matchInfo.hostTeam);
        teamWins[matchInfo.guestTeam][1]++;
      }
    }

    function updateTeamMomentum(uint8 _winTeamId, uint8 _lostTeamId)
        private {
      // awards teams with winning streak
      if (teamMomentum[_winTeamId] >= 0)
        teamMomentum[_winTeamId]++;
      else
        teamMomentum[_winTeamId] = 0;

      // punishes teams with losing streak
      if (teamMomentum[_lostTeamId] <= 0)
        teamMomentum[_lostTeamId]--;
      else
        teamMomentum[_lostTeamId] = 0;
    }
}
