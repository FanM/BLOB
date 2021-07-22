// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.6;

import './BLOBLeague.sol';
import './BLOBPlayer.sol';
import './BLOBRegistry.sol';
import './BLOBTeam.sol';
import './BLOBUtils.sol';

contract BLOBSeason is LeagueControlled, WithRegistry {

    struct MatchInfo {
        uint  matchId;
        uint  seasonId;
        uint8 matchRound;
        uint8 hostTeam;
        uint8 guestTeam;
        uint8 hostScore;
        uint8 guestScore;
        bool hostForfeit;
        bool guestForfeit;
    }

    event MatchStats (
        MatchInfo matchInfo
    );

    event PlayerStats (
        uint  matchId,
        uint  playerId,
        /*
         A 12-element array to document following player stats
         MIN, // play minutes
         FGM, // field goal made
         FGA, // filed goal attempted
         TPM, // 3 pointer made
         TPA, // 3 pointer attempted
         FTM, // free throw made
         FTA, // free throw attempted
         PTS, // points scored
         AST, // assists
         REB, // rebounds
         BLK, // blocks
         STL, // steals
        */
        uint8[12] stats
    );

    enum SeasonState {
      Active,
      Break,
      Offseason
    }

    using Percentage for uint8;
    using ArrayLib for uint8[];
    // constants
    uint8 public constant MINUTES_IN_MATCH = 48;
    // the number of positions a team may have in a game
    uint8 public constant TEAM_POSITIONS_BASE = 100;
    // the number of free throws a team may have in a game
    uint8 public constant TEAM_FREE_THROWS_BASE = 20;
    // the performance of league leading players
    // [shot%, shot3Point%, assist, rebound, blockage, steal, freeThrows%]
    uint8[7] public PLAYER_PERF_MAX = [70, 50, 15, 15, 5, 5, 100];

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
    MatchInfo[] public matchList;

    // the number of game played and won each team has,
    // used to track team ranking
    mapping(uint8=>uint8[2]) public teamWins;
    // the +/- of team cumulative wins/loss, used to track team momentum
    mapping(uint8=>int8) public teamMomentum;
    // season Id to champion team id
    mapping (uint=>uint8) public seasonToChampion;


    // other contracts
    BLOBLeague LeagueContract;
    BLOBPlayer PlayerContract;
    BLOBTeam TeamContract;

    constructor(address _registryContractAddr, address _leagueContractAddr)
        LeagueControlled(_leagueContractAddr)
        WithRegistry(_registryContractAddr) {
      LeagueContract = BLOBLeague(_leagueContractAddr);
    }

    modifier inState(SeasonState state) {
        require(state == seasonState, 'Season state does not allow this.');
        _;
    }

    function Init() external leagueOnly {
      PlayerContract = BLOBPlayer(RegistryContract.PlayerContract());
      TeamContract = BLOBTeam(RegistryContract.TeamContract());
    }

    function PlayMatch() external leagueOnly inState(SeasonState.Active) {
      require(matchIndex < matchList.length,
              "Match index reached the end of the match list.");

      MatchInfo memory matchInfo = matchList[matchIndex];
      uint seed = playMatchAndUpdateResult(matchInfo, block.timestamp);
      if (matchIndex+1 < matchList.length) {
        if (matchRound != matchList[matchIndex+1].matchRound) {
          // we are at the end of the current round
          matchRound++;
          require(
            matchRound == matchList[matchIndex+1].matchRound,
            "Unexpected: games should be scheduled monotonically into matchList."
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
      uint8 teamCount = TeamContract.GetTeamCount();
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

      // TODO: update player salaries

      // increment player age
      PlayerContract.UpdatePlayerPhysicalCondition(seed);

      seasonState = SeasonState.Offseason;
      seasonId++;
    }

    // rank teams based on win percentage in descending order
    function GetTeamRanking()
        public view returns(uint8[] memory ranking) {
      uint8 teamCount = TeamContract.GetTeamCount();
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
      uint8 teamCount = TeamContract.GetTeamCount();
      if (teamCount < 2)
        revert("Must have at least 2 teams to schedule a season.");

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
                MatchInfo(
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
              MatchInfo(
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
        MatchInfo memory matchInfo = matchList[i];
        matchInfo.matchId = matchId++;
        matchInfo.matchRound += maxMatchRounds;
        uint8 curHost = matchInfo.hostTeam;
        matchInfo.hostTeam = matchInfo.guestTeam;
        matchInfo.guestTeam = curHost;
        matchList.push(matchInfo);
      }
      maxMatchRounds *= 2;
      require(
        matchList.length == matchId,
        "Unexpected: inconsistant match scheduling."
      );
    }

    function playMatchAndUpdateResult(MatchInfo memory _matchInfo, uint _seed)
        private returns(uint seed) {

      require(
        _matchInfo.hostTeam != _matchInfo.guestTeam,
        "Unexpected: Cannot play against the same team!"
      );
      (uint8 hostOffence, uint8 hostDefence) =
          TeamContract.GetTeamOffenceAndDefence(_matchInfo.hostTeam);
      (uint8 guestOffence, uint8 guestDefence) =
          TeamContract.GetTeamOffenceAndDefence(_matchInfo.guestTeam);

      // [TotalAttempts, FTAttempts, 3PAttempts, FGAttempts]
      // This is a hack to get rid of the stack too deep exception
      uint8[4] memory attempts = [
        // allocate positions based on team offenceScore and current momentum
        (2 * TEAM_POSITIONS_BASE).getRatio(hostOffence, guestOffence)
                                 .plusInt8(teamMomentum[_matchInfo.hostTeam]),
        // allocate free throws based on team defenceScore
        (2 * TEAM_FREE_THROWS_BASE).getRatio(hostDefence, guestDefence),
        0, // will get 2P & 3P attempts later
        0];

      uint8 hostScore;
      (bool passed,) =
        TeamContract.ValidateTeamPlayerGameTime(_matchInfo.hostTeam);
      if (passed) {
        // if one team is not eligible to play, we treat it as a forfeit and
        // leave its score as 0
        (hostScore, seed) = calculateTeamOffenceScore(
          _matchInfo.matchId,
          _matchInfo.hostTeam,
          attempts,
          _seed
          );
      } else {
        matchList[matchIndex].hostForfeit = true;
      }
      // guestPositions
      attempts[0] = (2 * TEAM_POSITIONS_BASE).getRatio(guestOffence, hostOffence)
                                  .plusInt8(teamMomentum[_matchInfo.guestTeam]);
      // guestFTAttempts
      attempts[1] = 2 * TEAM_FREE_THROWS_BASE - attempts[1];

      uint8 guestScore;
      (passed,) =
        TeamContract.ValidateTeamPlayerGameTime(_matchInfo.guestTeam);
      if (passed) {
        (guestScore, seed) = calculateTeamOffenceScore(
          _matchInfo.matchId,
          _matchInfo.guestTeam,
          attempts,
          seed
          );
      } else {
        matchList[matchIndex].guestForfeit = true;
      }
      matchList[matchIndex].hostScore = hostScore;
      matchList[matchIndex].guestScore = guestScore;
      emit MatchStats(matchList[matchIndex]);

      // increment games played
      teamWins[_matchInfo.hostTeam][0]++;
      teamWins[_matchInfo.guestTeam][0]++;
      if (hostScore > guestScore) {
        updateTeamMomentum(_matchInfo.hostTeam, true);
        updateTeamMomentum(_matchInfo.guestTeam, false);
        // increment games won
        teamWins[_matchInfo.hostTeam][1]++;
      } else if (hostScore < guestScore) {
        updateTeamMomentum(_matchInfo.hostTeam, false);
        updateTeamMomentum(_matchInfo.guestTeam, true);
        teamWins[_matchInfo.guestTeam][1]++;
      } // TODO: add the overtime logic
    }

    function calculateTeamOffenceScore(uint _matchId,
                                       uint8 _teamId,
                                       uint8[4] memory _attempts,
                                       uint _seed)
        private returns(uint8 totalScore, uint seed) {

      uint[] memory teamPlayerIds = TeamContract.GetTeamRosterIds(_teamId);
      BLOBTeam.Team memory team = TeamContract.GetTeam(_teamId);

      // 3P attempts
      _attempts[2] = _attempts[0].multiplyPct(team.shot3PAllocation);
      // 2P attempts
      _attempts[3] = _attempts[0] - _attempts[2];
      seed = _seed;
      uint8 performanceFactor;

      for (uint i=0; i<teamPlayerIds.length; i++) {
        if (PlayerContract.CanPlay(teamPlayerIds[i], matchRound)) {
          // draw a random number between 90% and 110% for a player's
          // performance fluctuation in every game
          (performanceFactor, seed) = Random.randrange(90, 110, seed);
          uint8[12] memory playerStats;
          calulatePlayerStats(performanceFactor,
                              teamPlayerIds[i],
                              playerStats,
                              _attempts);
          totalScore += playerStats[7];
          PlayerContract.UpdateNextAvailableRound(teamPlayerIds[i],
                                                  matchRound,
                                                  playerStats[0],
                                                  uint8(performanceFactor));
          emit PlayerStats(
                 _matchId,
                 teamPlayerIds[i],
                 playerStats);
        }
      }
    }

    function calulatePlayerStats(uint8 _perfFactor,
                                 uint _playerId,
                                 uint8[12] memory _playerStats,
                                 uint8[4] memory _attempts)
        private view {
      BLOBPlayer.Player memory player = PlayerContract.GetPlayer(_playerId);
      BLOBTeam.GameTime memory gameTime = TeamContract.GetPlayerGameTime(_playerId);
      uint8 playTimePct = gameTime.playTime.dividePct(MINUTES_IN_MATCH);
      // play minutes MIN
      _playerStats[0] = gameTime.playTime;
      // field goals FGM, FGA
      (_playerStats[1], _playerStats[2]) =
          calculateShotMade(
                            _attempts[3],
                            gameTime.shotAllocation,
                            PLAYER_PERF_MAX[0],
                            player.shot,
                            _perfFactor);
      // 3 pointers TPM, TPA
      (_playerStats[3], _playerStats[4]) =
          calculateShotMade(
                            _attempts[2],
                            gameTime.shot3PAllocation,
                            PLAYER_PERF_MAX[1],
                            player.shot3Point,
                            _perfFactor);
      // free throws FTM, FTA
      // allocates free throws based on shot allocation
      (_playerStats[5], _playerStats[6]) =
          calculateShotMade(_attempts[1],
                            gameTime.shotAllocation + gameTime.shot3PAllocation,
                            PLAYER_PERF_MAX[6],
                            player.freeThrow,
                            _perfFactor);
      // PTS
      _playerStats[7] = 2 * _playerStats[1] + 3 * _playerStats[3] + _playerStats[5];
      // AST
      _playerStats[8] =  PLAYER_PERF_MAX[2].multiplyPct(player.assist)
                                           .multiplyPct(playTimePct)
                                           .multiplyPct(_perfFactor);
      // REB
      _playerStats[9] =  PLAYER_PERF_MAX[3].multiplyPct(player.rebound)
                                           .multiplyPct(playTimePct)
                                           .multiplyPct(_perfFactor);
      // BLK
      _playerStats[10] =  PLAYER_PERF_MAX[4].multiplyPct(player.blockage)
                                            .multiplyPct(playTimePct)
                                            .multiplyPct(_perfFactor);
      // STL
      _playerStats[11] =  PLAYER_PERF_MAX[5].multiplyPct(player.steal)
                                            .multiplyPct(playTimePct)
                                            .multiplyPct(_perfFactor);
    }

    function calculateShotMade(uint8 _totalAttempts,
                               uint8 _allocation,
                               uint8 _baseMetric,
                               uint8 _idealShotPct,
                               uint8 _performanceFactor)
        private pure returns(uint8 made, uint8 attempts) {
      attempts = _totalAttempts.multiplyPct(_allocation);
      made = attempts.multiplyPct(_baseMetric
                                   .multiplyPct(_idealShotPct)
                                   .multiplyPct(_performanceFactor));
    }

    function updateTeamMomentum(uint8 _teamId, bool _increment)
        private {
        if (_increment)
          teamMomentum[_teamId]++;
        else
          teamMomentum[_teamId]--;
    }
}
