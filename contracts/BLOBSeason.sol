pragma solidity ^0.5.7;
pragma experimental ABIEncoderV2;

import './BLOBLeague.sol';
import './BLOBPlayer.sol';
import './BLOBTeam.sol';
import './BLOBUtils.sol';

contract BLOBSeason is LeagueControlled {

    event Match (
        uint  matchId,
        uint8 hostTeam,
        uint8 guestTeam,
        uint8 hostScore,
        uint8 guestScore);

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
    uint8 public constant MAX_MATCH_ROUNDS = 82;
    // the number of positions a team may have in a game
    uint8 public constant TEAM_POSITIONS_BASE = 100;
    // the number of free throws a team may have in a game
    uint8 public constant TEAM_FREE_THROWS_BASE = 20;
    // the performance of league leading players
    uint8[7] public PLAYER_PERF_MAX;

    // season id
    uint public seasonId;

    // match id
    uint public matchId;

    // match round
    uint8 public matchRound;

    // match list
    uint8[MAX_MATCH_ROUNDS][] matchList;

    // the number of wins each team has, used to track team ranking
    mapping(uint8=>uint8) public teamWins;
    // the +/- of team cumulative wins/loss, used to track team momentum
    mapping(uint8=>int8) public teamMomentum;

    // other contracts
    BLOBLeague LeagueContract;
    BLOBTeam TeamContract;

    constructor(address _teamContractAddr, address _leagueContractAddr)
        public
        LeagueControlled(_leagueContractAddr) {
      LeagueContract = BLOBLeague(_leagueContractAddr);
      TeamContract = BLOBTeam(_teamContractAddr);
      // [shot%, shot3Point%, assist, rebound, blockage, steal, freeThrows%]
      PLAYER_PERF_MAX = [80, 50, 20, 20, 5, 5, 100];
    }

    // league only
    function NextAction() external leagueOnly {
      playCurrentRound();
    }

    function playCurrentRound() private {
      // for each match in matchList[matchRound]
      //    playMatchAndUpdateResult
      require(matchRound < MAX_MATCH_ROUNDS,
        "The season is over");
      playMatchAndUpdateResult(0, 1, 0, now);
      matchRound++;
    }

    function startSeason() private {
      // 1. generate match list
      // 2.
    }

    function endSeason() private {
      // 1. finalize season stats
      // 2. update player salaries
      // 3. increment player age
    }

    function playMatchAndUpdateResult(uint8 _hostId,
                                      uint8 _guestId,
                                      uint _matchId,
                                      uint _seed)
        private returns(uint seed) {

      (uint8 hostOffence, uint8 hostDefence) =
          TeamContract.GetTeamOffenceAndDefence(_hostId);
      (uint8 guestOffence, uint8 guestDefence) =
          TeamContract.GetTeamOffenceAndDefence(_guestId);

      // [hostTotalAttempts, hostFTAttempts, hostFGAttempts, host3PAttempts]
      // This is a hack to get rid of the stack too deep exception
      uint8[4] memory attempts = [
        // allocate positions based on team offenceScore and current momentum
        (2 * TEAM_POSITIONS_BASE).getRatio(hostOffence, guestOffence)
                                 .plusInt8(teamMomentum[_hostId]),
        // allocate free throws based on team defenceScore
        (2 * TEAM_FREE_THROWS_BASE).getRatio(hostDefence, guestDefence),
        0, // will get 2P & 3P attempts later
        0];

      uint8 hostScore;
      (hostScore, seed) = calculateTeamOffenceScore(
        _matchId,
        _hostId,
        attempts,
        _seed
      );
      // guestPositions
      attempts[0] = (2 * TEAM_POSITIONS_BASE).getRatio(guestOffence, hostOffence)
                                             .plusInt8(teamMomentum[_guestId]);
      // guestFTAttempts
      attempts[1] = 2 * TEAM_FREE_THROWS_BASE - attempts[1];

      uint8 guestScore;
      (guestScore, seed) = calculateTeamOffenceScore(
        _matchId,
        _guestId,
        attempts,
        seed
      );

      emit Match(
        _matchId,
        _hostId,
        _guestId,
        hostScore,
        guestScore);

      if (hostScore > guestScore) {
        updateTeamMomentum(_hostId, true);
        updateTeamMomentum(_guestId, false);
        teamWins[_hostId]++;
      } else if (hostScore < guestScore) {
        updateTeamMomentum(_hostId, false);
        updateTeamMomentum(_guestId, true);
        teamWins[_guestId]++;
      } // TODO: add the overtime logic
    }

    function calculateTeamOffenceScore(uint _matchId,
                                       uint8 _teamId,
                                       uint8[4] memory _attempts,
                                       uint _seed)
        private returns(uint8 totalScore, uint seed) {

      BLOBPlayer.Player[] memory teamPlayers = TeamContract.GetTeamRoster(_teamId);
      BLOBTeam.Team memory team = TeamContract.GetTeam(_teamId);

      _attempts[2] = _attempts[0].multiplyPct(team.shot3PAllocation);
      _attempts[3] = _attempts[0] - _attempts[2];
      seed = _seed;
      int performanceFactor;

      for (uint i=0; i<teamPlayers.length; i++) {
        // draw a random number between 90% and 110% for a player's
        // performance fluctuation in every game
        (performanceFactor, seed) = Random.randrange(90, 110, seed);
        uint8[] memory playerStats = new uint8[](12);
        calulatePlayerStats(uint8(performanceFactor),
                            teamPlayers[i],
                            playerStats,
                            _attempts);
        totalScore += playerStats[7];
        emit PlayerStats(
               _matchId,
               teamPlayers[i].id,
               playerStats);
      }
    }

    function calulatePlayerStats(uint8 _perfFactor,
                                 BLOBPlayer.Player memory player,
                                 uint8[] memory _playerStats,
                                 uint8[4] memory _attempts)
        private view {
      BLOBTeam.GameTime memory gameTime = TeamContract.GetPlayerGameTime(player.id);
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
      // allocates free throws based on player minitues
      (_playerStats[5], _playerStats[6]) =
          calculateShotMade(_attempts[1],
                            _playerStats[0].dividePct(LeagueContract.MINUTES_IN_MATCH()),
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
