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
      Active,
      Break,
      Offseason
    }

    event MatchStats (
        BLOBMatch.MatchInfo matchInfo,
        uint timestamp
    );

    using Percentage for uint8;
    using ArrayLib for uint8[];

    // season state
    SeasonState public seasonState = SeasonState.Offseason;

    // season id
    uint public seasonId;

    // max rounds for a season
    uint8 public maxMatchRounds;

    // match round
    uint8 public matchRound;

    // match index within a matchRound
    uint public matchIndex;

    // match list
    BLOBMatch.MatchInfo[] public matchList;

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

    function PlayMatch() external leagueOnly inState(SeasonState.Active) {
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

    function StartSeason() external leagueOnly inState(SeasonState.Offseason) {
      // clears previous season's schedules
      delete matchList;
      uint8 teamCount = TeamContract.teamCount();
      for (uint8 i=0; i<teamCount; i++) {
        teamWins[i] = [0, 0];
        teamMomentum[i] = 0;
      }
      // generate match list
      scheduleGamesForSeason();
      matchRound  = 0;
      matchIndex = 0;
      seasonState = SeasonState.Active;
    }

    function endSeason(uint seed) private inState(SeasonState.Active) {
      // gets season champion
      seasonToChampion[seasonId] = GetTeamRanking()[0];

      // increment player age, physical strength and salaries
      PlayerContract.UpdatePlayerConditions(seed);

      seasonState = SeasonState.Offseason;
      seasonId++;
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

    function scheduleGamesForSeason() private {
      uint8 teamCount = TeamContract.teamCount();
      if (teamCount < 2)
        revert(uint8(BLOBLeague.ErrorCode.SEASON_NOT_ENOUGH_TEAMS).toStr());

      // schedules round-robin games for each team
      // adopts the paring table from:
      // https://en.wikipedia.org/wiki/Round-robin_tournament
      bool isTeamCountEven = (teamCount % 2) == 0;
      uint8 n = uint8(isTeamCountEven? teamCount : teamCount+1);
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
      uint matchId  = 0;
      for (uint8 i=0; i<maxMatchRounds; i++) {
        uint8[] memory opponents = new uint8[](cols);
        for (uint8 j=0; j<cols; j++) {
          opponents[j] = gameTable[(i+1) % maxMatchRounds][cols-j-1];
          if (opponents[j] == gameTable[i][j]) {
            if (isTeamCountEven) // otherwise bye for this round
              matchList.push(
                BLOBMatch.MatchInfo(
                  matchId++,        // match id
                  seasonId,         // season id
                  i,                // match round
                  gameTable[i][j],  // host team id
                  n - 1,            // guest team id
                  0,                // host team score
                  0,                // guest team score
                  false,            // host forfeit
                  false             // guest forfeit
                )
              );
          } else {
            matchList.push(
              BLOBMatch.MatchInfo(
                matchId++,        // match id
                seasonId,         // season id
                i,                // match round
                gameTable[i][j],  // host team id
                opponents[j],     // guest team id
                0,                // host team score
                0,                // guest team score
                false,            // host forfeit
                false             // guest forfeit
              )
            );
          }
        }
      }
      // schedule again by swapping host and guest
      uint curEnd = matchId;
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
      assert(matchList.length == matchId);
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
        (hostScore, guestScore, seed) =
          MatchContract.PlayMatch(matchInfo, false, _seed);
        while (hostScore == guestScore) {
          uint8 hostScoreOT;
          uint8 guestScoreOT;
          (hostScoreOT, guestScoreOT, seed) =
            MatchContract.PlayMatch(matchInfo, true, seed);
          hostScore += hostScoreOT;
          guestScore += guestScoreOT;
        }
      }

      matchInfo.hostScore = hostScore;
      matchInfo.guestScore = guestScore;
      emit MatchStats(matchInfo, block.timestamp);

      // increment games played
      teamWins[matchInfo.hostTeam][0]++;
      teamWins[matchInfo.guestTeam][0]++;
      if (hostScore > guestScore) {
        updateTeamMomentum(matchInfo.hostTeam, true);
        updateTeamMomentum(matchInfo.guestTeam, false);
        // increment games won
        teamWins[matchInfo.hostTeam][1]++;
      } else if (hostScore < guestScore) {
        updateTeamMomentum(matchInfo.hostTeam, false);
        updateTeamMomentum(matchInfo.guestTeam, true);
        teamWins[matchInfo.guestTeam][1]++;
      }
    }

    function updateTeamMomentum(uint8 _teamId, bool _increment)
        private {
        if (_increment)
          teamMomentum[_teamId]++;
        else
          teamMomentum[_teamId]--;
    }
}
