// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.6;

import "./BLOBRegistry.sol";
import './BLOBLeague.sol';
import './BLOBPlayer.sol';
import './BLOBTeam.sol';
import './BLOBSeason.sol';
import './BLOBUtils.sol';

contract BLOBMatch is WithRegistry {

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

    event PlayerStats (
        uint matchId,
        uint playerId,
        bool overtime,
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

    // constants
    uint8 public constant MINUTES_IN_MATCH = 48;
    uint8 public constant MINUTES_IN_OT = 5;
    // the number of positions a team may have in regular time
    uint8 public constant TEAM_POSITIONS_BASE = 100;
    // the number of free throws a team may have in regular time
    uint8 public constant TEAM_FREE_THROWS_BASE = 20;
    // the number of positions a team may have in overtime
    uint8 public constant TEAM_POSITIONS_OT = 10;
    // the number of free throws a team may have in overtime
    uint8 public constant TEAM_FREE_THROWS_OT = 5;
    // the performance of league leading players
    // [shot%, shot3Point%, assist, rebound, blockage, steal, freeThrows%]
    uint8[7] public PLAYER_PERF_MAX = [70, 50, 20, 20, 10, 10, 100];

    using Percentage for uint8;

    BLOBPlayer PlayerContract;
    BLOBTeam TeamContract;
    BLOBSeason SeasonContract;

    constructor(address _registryAddr)
        WithRegistry(_registryAddr) {
    }

    function Init() external leagueOnly {
      PlayerContract = BLOBPlayer(RegistryContract.PlayerContract());
      TeamContract = BLOBTeam(RegistryContract.TeamContract());
      SeasonContract = BLOBSeason(RegistryContract.SeasonContract());
    }

    // validate the game time eligibility
    function ValidateTeamPlayerGameTime(uint8 _teamId)
        external view returns(bool passed, string memory desc) {
      BLOBPlayer.Player[] memory teamPlayers = getTeamRoster(_teamId);
      uint8 playableRosterCount = 0;
      uint8 totalShotAllocation = 0;
      uint8 totalShot3PointAllocation = 0;
      uint8[5] memory positionMinutes;
      bool[5] memory positionStarter;
      uint8 matchRound = SeasonContract.matchRound();
      for (uint8 i=0; i<teamPlayers.length; i++) {
        BLOBPlayer.Player memory player = teamPlayers[i];
        BLOBTeam.GameTime memory gameTime =
          TeamContract.GetPlayerGameTime(player.id);
        // 1. player must be eligible for playing, not injured or retired
        if (PlayerContract.CanPlay(player.id, matchRound)) {
          if (gameTime.playTime > 0) {
            playableRosterCount++;
            positionMinutes[uint(player.position)] += gameTime.playTime;

            if (gameTime.starter) {
              if (!positionStarter[uint(player.position)])
                positionStarter[uint(player.position)] = true;
              else
                // 2. each position can have only one starter
                return (false,
                  "Each position can have only one starter");
            }

            // 3. shot allocation per player must be less than
            //    MAX_PLAYER_SHOT_ALLOC_PCT
            if (gameTime.shotAllocation + gameTime.shot3PAllocation >
                  TeamContract.MAX_PLAYER_SHOT_ALLOC_PCT())
              return (false,
                "Shot allocation per player must be less than MAX_PLAYER_SHOT_ALLOC_PCT");

            // 4. shot allocation per player must be less than
            //    their play time percentage
            if (gameTime.shotAllocation + gameTime.shot3PAllocation >
                gameTime.playTime.dividePct(MINUTES_IN_MATCH))
              return (false,
                "Shot allocation per player must be less than their play time percentage");

            totalShotAllocation += gameTime.shotAllocation;
            totalShot3PointAllocation += gameTime.shot3PAllocation;
          }
        }
      }
      // 5. number of players per team must be within
      // [MIN_PLAYERS_ON_ROSTER, MAX_PLAYERS_ON_ROSTER]
      if (playableRosterCount < TeamContract.MIN_PLAYERS_ON_ROSTER()
            || playableRosterCount > TeamContract.MAX_PLAYERS_ON_ROSTER())
        return (false,
          "Number of players per team must be within [minPlayersOnRoster, maxPlayersOnRoster]");
      // 6. players of the same position must have play time add up to 48 minutes,
      // 7. all starters must be playable
      for (uint i=0; i<5; i++) {
        if (positionMinutes[i] != MINUTES_IN_MATCH)
          return (false,
            "Players of the same position must have play time add up to 48 minutes");

        if (!positionStarter[i])
          return (false,
            "Starter in each position must be playable");
      }
      // 8. total shot & shot3Point allocations must account for 100%
      if (totalShotAllocation != 100 || totalShot3PointAllocation !=100)
        return (false,
          "Total shot & shot3Point allocations must account for 100%");

      return (true, "");
    }

    function GetTeamOffenceAndDefence(uint8 _teamId, bool _overtime)
        view public returns(uint8 teamOffence, uint8 teamDefence) {
      BLOBPlayer.Player[] memory teamPlayers = getTeamRoster(_teamId);
      uint8 matchRound = SeasonContract.matchRound();

      for (uint8 i=0; i<teamPlayers.length; i++) {
        BLOBPlayer.Player memory player = teamPlayers[i];
        // don't consider player injuries after regular time
        if (_overtime || PlayerContract.CanPlay(player.id, matchRound)) {
          BLOBTeam.GameTime memory gameTime =
            TeamContract.GetPlayerGameTime(player.id);

          // for simplicity, only starters can play overtime
          if (_overtime && !gameTime.starter)
            continue;

          uint8 weightedSumOffence = (player.shot / 2         // weights 50%
                                      + player.shot3Point / 4 // weights 25%
                                      + player.assist / 4)    // weights 25%
                                      / 5; // players in each position accounts for 20%

          uint8 weightedSumDefence = (player.rebound / 2      // weights 50%
                                      + player.blockage / 4   // weights 25%
                                      + player.steal / 4)     // weights 25%
                                      / 5; // players in each position accounts for 20%
          if (!_overtime) {
            // as in regular time players in the same position share play time,
            // we weight their contributions by their shares
            uint8 playerPlayTimePct = gameTime.playTime.dividePct(MINUTES_IN_MATCH);
            weightedSumOffence = weightedSumOffence.multiplyPct(playerPlayTimePct);
            weightedSumDefence = weightedSumDefence.multiplyPct(playerPlayTimePct);
          }
          teamOffence += weightedSumOffence;
          teamDefence += weightedSumDefence;
        }
      }
    }

    function PlayMatch(MatchInfo calldata _matchInfo,
                       bool _overtime,
                       uint _seed)
        external seasonOnly
        returns(uint8 hostScore, uint8 guestScore, uint seed) {

      uint8 hostPositions;
      uint8 hostFreeThrows;
      uint8 guestPositions;
      uint8 guestFreeThrows;

      (hostPositions, hostFreeThrows,
       guestPositions, guestFreeThrows) = getGamePositions(
                                            _matchInfo.hostTeam,
                                            _matchInfo.guestTeam,
                                            _overtime);
      if (!_matchInfo.hostForfeit)
        (hostScore, seed) = playMatchByTeam(_matchInfo.matchId,
                                            _matchInfo.hostTeam,
                                            hostPositions,
                                            hostFreeThrows,
                                            _overtime,
                                            _seed);
      if (!_matchInfo.guestForfeit)
        (guestScore, seed) = playMatchByTeam(_matchInfo.matchId,
                                            _matchInfo.guestTeam,
                                            guestPositions,
                                            guestFreeThrows,
                                            _overtime,
                                            seed);
    }

    function getTeamRoster(uint8 _teamId)
        view private returns(BLOBPlayer.Player[] memory players) {
      players = PlayerContract.GetPlayersByIds(
        TeamContract.GetTeamRosterIds(_teamId));
    }

    function getOffenceAndDiffenceRatio(uint8 _hostTeam,
                                        uint8 _guestTeam,
                                        bool _overtime)
        private view returns (uint8 hostOffenceRatio, uint8 hostDefenceRatio,
                              uint8 guestOffenceRatio, uint8 guestDefenceRatio) {
      (uint8 hostOffence, uint8 hostDefence) =
          GetTeamOffenceAndDefence(_hostTeam, _overtime);
      (uint8 guestOffence, uint8 guestDefence) =
          GetTeamOffenceAndDefence(_guestTeam, _overtime);
      uint8 pct = 100;
      hostOffenceRatio = pct.getRatio(hostOffence, guestOffence);
      guestOffenceRatio = pct - hostOffenceRatio;
      hostDefenceRatio = pct.getRatio(hostDefence, guestDefence);
      guestDefenceRatio = pct - hostDefenceRatio;
    }

    function getGamePositions(uint8 _hostTeam,
                              uint8 _guestTeam,
                              bool _overtime)
        private view returns (uint8 hostPositions, uint8 hostFreeThrows,
                              uint8 guestPositions, uint8 guestFreeThrows) {
      (uint8 hostORatio, uint8 hostDRatio,
       uint8 guestORatio, uint8 guestDRatio) = getOffenceAndDiffenceRatio(
                                                  _hostTeam,
                                                  _guestTeam,
                                                  _overtime);
      hostPositions = _overtime?
        (2 * TEAM_POSITIONS_OT).multiplyPct(hostORatio) :
        (2 * TEAM_POSITIONS_BASE).multiplyPct(hostORatio)
                                 .plusInt8(SeasonContract.teamMomentum(_hostTeam));
      hostFreeThrows = _overtime?
        (2 * TEAM_FREE_THROWS_OT).multiplyPct(hostDRatio) :
        (2 * TEAM_FREE_THROWS_BASE).multiplyPct(hostDRatio);

      guestPositions = _overtime?
        (2 * TEAM_POSITIONS_OT).multiplyPct(guestORatio) :
        (2 * TEAM_POSITIONS_BASE).multiplyPct(guestDRatio)
                                 .plusInt8(SeasonContract.teamMomentum(_guestTeam));
      guestFreeThrows = _overtime?
        (2 * TEAM_FREE_THROWS_OT).multiplyPct(guestORatio) :
        (2 * TEAM_FREE_THROWS_BASE).multiplyPct(guestDRatio);
    }

    function playMatchByTeam(uint _matchId,
                             uint8 _teamId,
                             uint8 _teamPositions,
                             uint8 _teamFreeThrows,
                             bool _overtime,
                             uint _seed) private returns (uint8 score,
                                                          uint seed) {
      // [TotalAttempts, FTAttempts, 3PAttempts, FGAttempts]
      // This is a hack to get rid of the stack too deep exception
      uint8[4] memory attempts = [
        _teamPositions,
        _teamFreeThrows,
        0, // will get 2P & 3P attempts later
        0];

      // if one team is not eligible to play, we treat it as a forfeit and
      // leave its score as 0
      (score, seed) = calculateTeamOffenceScore(
        _matchId,
        _teamId,
        attempts,
        _overtime,
        _seed
        );
    }

    function calculateTeamOffenceScore(uint _matchId,
                                       uint8 _teamId,
                                       uint8[4] memory _attempts,
                                       bool _overtime,
                                       uint _seed)
        private returns(uint8 totalScore, uint seed) {

      uint[] memory teamPlayerIds = TeamContract.GetTeamRosterIds(_teamId);

      // 3P attempts
      _attempts[2] = _attempts[0].multiplyPct(TeamContract.shot3PAllocation(_teamId));
      // 2P attempts
      _attempts[3] = _attempts[0] - _attempts[2];
      seed = _seed;
      uint8 performanceFactor;
      uint8 matchRound = SeasonContract.matchRound();
      for (uint i=0; i<teamPlayerIds.length; i++) {
        if (_overtime || PlayerContract.CanPlay(teamPlayerIds[i], matchRound)) {
          // draw a random number between 90% and 110% for a player's
          // performance fluctuation in every game
          (performanceFactor, seed) = Random.randrange(90, 110, seed);
          (uint8 playerMin, uint8 playerPTS) = emitPlayerStats(_matchId,
                                                               teamPlayerIds[i],
                                                               performanceFactor,
                                                               _attempts,
                                                               _overtime);
          totalScore += playerPTS;

          if (!_overtime)
            // uses regular time to assess player injuries
            PlayerContract.UpdateNextAvailableRound(teamPlayerIds[i],
                                                    matchRound,
                                                    playerMin,
                                                    uint8(performanceFactor));
        }
      }
    }

    function emitPlayerStats(uint _matchId,
                             uint _playerId,
                             uint8 _perfFactor,
                             uint8[4] memory _attempts,
                             bool _overtime)
        private returns (uint8, uint8) {
      BLOBPlayer.Player memory player = PlayerContract.GetPlayer(_playerId);
      BLOBTeam.GameTime memory gameTime = TeamContract.GetPlayerGameTime(_playerId);

      // for simplicity, only starters can play overtime
      if (_overtime && !gameTime.starter)
        return (0, 0);

      uint8[12] memory playerStats;
      uint8 playTimePct = gameTime.playTime.dividePct(MINUTES_IN_MATCH);
      // play minutes MIN
      playerStats[0] = _overtime? MINUTES_IN_OT : gameTime.playTime;
      // field goals FGM, FGA
      (playerStats[1], playerStats[2]) =
          calculateShotMade(
                            _attempts[3],
                            _overtime? playTimePct : gameTime.shotAllocation,
                            PLAYER_PERF_MAX[0],
                            player.shot,
                            _perfFactor);
      // 3 pointers TPM, TPA
      (playerStats[3], playerStats[4]) =
          calculateShotMade(
                            _attempts[2],
                            _overtime? playTimePct : gameTime.shot3PAllocation,
                            PLAYER_PERF_MAX[1],
                            player.shot3Point,
                            _perfFactor);
      // free throws FTM, FTA
      // allocates free throws based on shot allocation
      (playerStats[5], playerStats[6]) =
          calculateShotMade(_attempts[1],
                            _overtime? playTimePct : gameTime.shotAllocation +
                                                     gameTime.shot3PAllocation,
                            PLAYER_PERF_MAX[6],
                            player.freeThrow,
                            _perfFactor);
      // PTS
      playerStats[7] = 2 * playerStats[1] + 3 * playerStats[3] + playerStats[5];
      // AST
      playerStats[8] =  PLAYER_PERF_MAX[2].multiplyPct(player.assist)
                                           .multiplyPct(playTimePct)
                                           .multiplyPct(_perfFactor);
      // REB
      playerStats[9] =  PLAYER_PERF_MAX[3].multiplyPct(player.rebound)
                                           .multiplyPct(playTimePct)
                                           .multiplyPct(_perfFactor);
      // BLK
      playerStats[10] =  PLAYER_PERF_MAX[4].multiplyPct(player.blockage)
                                            .multiplyPct(playTimePct)
                                            .multiplyPct(_perfFactor);
      // STL
      playerStats[11] =  PLAYER_PERF_MAX[5].multiplyPct(player.steal)
                                            .multiplyPct(playTimePct)
                                            .multiplyPct(_perfFactor);
      emit PlayerStats(
             _matchId,
             _playerId,
             _overtime,
             playerStats);
      return (playerStats[0], playerStats[7]); // MIN, PTS
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
}
