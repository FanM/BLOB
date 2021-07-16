pragma solidity ^0.5.7;
pragma experimental ABIEncoderV2;

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
        uint8[] stats
    );

    enum SeasonState {
      Active,
      Break,
      Offseason
    }

    using Percentage for uint8;
    // constants
    // the number of positions a team may have in a game
    uint8 public constant TEAM_POSITIONS_BASE = 100;
    // the number of free throws a team may have in a game
    uint8 public constant TEAM_FREE_THROWS_BASE = 20;
    // the performance of league leading players
    uint8[7] public PLAYER_PERF_MAX;

    // season state
    SeasonState public seasonState;

    // season id
    uint public seasonId;

    // match id
    uint public matchId;

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
        public
        LeagueControlled(_leagueContractAddr)
        WithRegistry(_registryContractAddr) {
      LeagueContract = BLOBLeague(_leagueContractAddr);
      // [shot%, shot3Point%, assist, rebound, blockage, steal, freeThrows%]
      PLAYER_PERF_MAX = [70, 50, 15, 15, 5, 5, 100];
    }

    function Init() external leagueOnly {
      PlayerContract = BLOBPlayer(RegistryContract.PlayerContract());
      TeamContract = BLOBTeam(RegistryContract.TeamContract());
      seasonState = SeasonState.Offseason;
    }

    function PlayMatch() external leagueOnly {
      require(seasonState == BLOBSeason.SeasonState.Active,
              "Matches can only be played in active season.");
      require(matchIndex < matchList.length,
              "Match index reached the end of the match list.");

      MatchInfo memory matchInfo = matchList[matchIndex];
      playMatchAndUpdateResult(matchInfo, now);
      if (matchIndex+1 < matchList.length) {
        if (matchRound != matchList[matchIndex+1].matchRound) {
          // we are at the end of the current round
          matchRound++;
          if (matchRound != matchList[matchIndex+1].matchRound)
            revert("Games should be scheduled monotonically into matchList.");
        }
      } else {
        // reaches the end of current season
        endSeason();
      }

      matchIndex++;
    }

    function StartSeason() external leagueOnly {
      require(seasonState == BLOBSeason.SeasonState.Offseason,
              "Can only start from offseason.");
      // clears previous season's schedules
      delete matchList;
      BLOBTeam.Team[] memory teams = TeamContract.GetAllTeams();
      for (uint8 i=0; i<teams.length; i++) {
        teamWins[teams[i].id] = [0, 0];
        teamMomentum[teams[i].id] = 0;
      }
      // generate match list
      scheduleGamesForSeason();
      matchRound  = 0;
      matchIndex = 0;
      seasonState = SeasonState.Active;
    }

    function endSeason() private {
      require(seasonState == BLOBSeason.SeasonState.Active,
              "Can only end from active season.");
      // finalize season stats
      seasonToChampion[seasonId] = GetTeamWithMostWins();

      // TODO: update player salaries

      // increment player age
      PlayerContract.UpdatePlayerPhysicalCondition(now);

      seasonState = SeasonState.Offseason;
      seasonId++;
    }

    function GetTeamWithMostWins()
        public view returns(uint8 leader) {
      require(seasonState == BLOBSeason.SeasonState.Active,
              "Can only read from active season.");
      BLOBTeam.Team[] memory teams = TeamContract.GetAllTeams();
      uint8 leaderWinPct;
      for (uint8 i=0; i<teams.length; i++) {
        BLOBTeam.Team memory team = teams[i];
        if (teamWins[team.id][0] > 0) {
          uint8 winPct = teamWins[team.id][1].dividePct(teamWins[team.id][0]);
          if (winPct > leaderWinPct) {
            leaderWinPct = winPct;
            leader = team.id;
          }
        }
      }
    }

    function scheduleGamesForSeason() private {
      BLOBTeam.Team[] memory teams = TeamContract.GetAllTeams();
      if (teams.length < 2)
        revert("Must have at least 2 teams to schedule a season.");

      // schedules round-robin games for each team
      // adopts the paring table from:
      // https://en.wikipedia.org/wiki/Round-robin_tournament
      bool isTeamCountEven = (teams.length % 2) == 0;
      uint8 n = uint8(isTeamCountEven? teams.length : teams.length+1);
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
    }

    function playMatchAndUpdateResult(MatchInfo memory _matchInfo, uint _seed)
        private returns(uint seed) {

      (uint8 hostOffence, uint8 hostDefence) =
          TeamContract.GetTeamOffenceAndDefence(_matchInfo.hostTeam);
      (uint8 guestOffence, uint8 guestDefence) =
          TeamContract.GetTeamOffenceAndDefence(_matchInfo.guestTeam);

      // [hostTotalAttempts, hostFTAttempts, hostFGAttempts, host3PAttempts]
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

      (passed,) =
        TeamContract.ValidateTeamPlayerGameTime(_matchInfo.guestTeam);
      uint8 guestScore;
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

      _attempts[2] = _attempts[0].multiplyPct(team.shot3PAllocation);
      _attempts[3] = _attempts[0] - _attempts[2];
      seed = _seed;
      int performanceFactor;

      for (uint i=0; i<teamPlayerIds.length; i++) {
        if (PlayerContract.CanPlay(teamPlayerIds[i], matchRound)) {
          // draw a random number between 90% and 110% for a player's
          // performance fluctuation in every game
          (performanceFactor, seed) = Random.randrange(90, 110, seed);
          uint8[] memory playerStats = new uint8[](12);
          calulatePlayerStats(uint8(performanceFactor),
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
                                 uint8[] memory _playerStats,
                                 uint8[4] memory _attempts)
        private view {
      BLOBPlayer.Player memory player = PlayerContract.GetPlayer(_playerId);
      BLOBTeam.GameTime memory gameTime = TeamContract.GetPlayerGameTime(_playerId);
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
                                            .multiplyPct(_perfFactor);
      // REB
      _playerStats[9] =  PLAYER_PERF_MAX[3].multiplyPct(player.rebound)
                                            .multiplyPct(_perfFactor);
      // BLK
      _playerStats[10] =  PLAYER_PERF_MAX[4].multiplyPct(player.blockage)
                                            .multiplyPct(_perfFactor);
      // STL
      _playerStats[11] =  PLAYER_PERF_MAX[5].multiplyPct(player.steal)
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
