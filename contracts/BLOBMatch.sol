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
    // overtime
    uint8 public constant MINUTES_IN_OT = 5;
    // the max number of playable players in a match
    uint8 constant public MAX_PLAYERS_ON_ROSTER = 15;
    // the min number of playable players in a match
    uint8 constant public MIN_PLAYERS_ON_ROSTER = 8;
    // the max percentage of team shots a single player is allowed to take
    uint8 constant public MAX_PLAYER_SHOT_ALLOC_PCT = 50;
    // the max performance percentage a player may have in a game
    uint8 constant public MAX_PLAYER_PERF_PCT = 120;
    // the min performance percentage a player may have in a game
    uint8 constant public MIN_PLAYER_PERF_PCT = 80;
    // the number of positions a team may have in regular time
    uint8 public constant TEAM_POSITIONS_BASE = 100;
    // the number of free throws a team may have in regular time
    uint8 public constant TEAM_FREE_THROWS_BASE = 20;
    // the number of positions a team may have in overtime
    uint8 public constant TEAM_POSITIONS_OT = 10;
    // the number of free throws a team may have in overtime
    uint8 public constant TEAM_FREE_THROWS_OT = 5;
    // the maximum performance of league leading players
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
        external view returns(BLOBLeague.ErrorCode errorCode) {
      BLOBPlayer.Player[] memory teamPlayers = getTeamRoster(_teamId);
      uint8 playableRosterCount = 0;
      uint8 totalShotAllocation = 0;
      uint8 totalShot3PointAllocation = 0;
      uint8[5] memory positionMinutes;
      bool[5] memory positionStarter;
      uint8 matchRound = SeasonContract.matchRound();
      for (uint8 i=0; i<teamPlayers.length; i++) {
        BLOBPlayer.Player memory player = teamPlayers[i];
        BLOBPlayer.GameTime memory gameTime =
          PlayerContract.GetPlayerGameTime(player.id);
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
                return BLOBLeague.ErrorCode.TEAM_REDUNDANT_STARTERS;
            }

            // 3. shot allocation per player must be less than
            //    MAX_PLAYER_SHOT_ALLOC_PCT
            if (gameTime.shotAllocation + gameTime.shot3PAllocation >
                  MAX_PLAYER_SHOT_ALLOC_PCT)
              return BLOBLeague.ErrorCode.PLAYER_EXCEED_SHOT_ALLOC;

            // 4. shot allocation per player must be less than
            //    their play time percentage
            if (gameTime.shotAllocation + gameTime.shot3PAllocation >
                gameTime.playTime.dividePct(MINUTES_IN_MATCH))
              return BLOBLeague.ErrorCode.PLAYER_EXCEED_TIME_ALLOC;

            totalShotAllocation += gameTime.shotAllocation;
            totalShot3PointAllocation += gameTime.shot3PAllocation;
          }
        }
      }
      // 5. number of players per team must be within
      // [MIN_PLAYERS_ON_ROSTER, MAX_PLAYERS_ON_ROSTER]
      if (playableRosterCount < MIN_PLAYERS_ON_ROSTER)
        return BLOBLeague.ErrorCode.TEAM_LESS_THAN_MIN_ROSTER;
      if (playableRosterCount > MAX_PLAYERS_ON_ROSTER)
        return BLOBLeague.ErrorCode.TEAM_MORE_THAN_MAX_ROSTER;

      // 6. players of the same position must have play time add up to 48 minutes,
      for (uint i=0; i<5; i++) {
        if (positionMinutes[i] != MINUTES_IN_MATCH)
          return BLOBLeague.ErrorCode.TEAM_POS_TIME_ALLOC_INVALID;

        // 7. all starters must be playable
        if (!positionStarter[i])
          return BLOBLeague.ErrorCode.TEAM_NOT_ENOUGH_STARTERS;
      }
      // 8. total shot & shot3Point allocations must account for 100%
      if (totalShotAllocation != 100 || totalShot3PointAllocation !=100)
        return BLOBLeague.ErrorCode.TEAM_INSUFFICIENT_SHOT_ALLOC;

      return BLOBLeague.ErrorCode.OK;
    }

    function GetTeamOffenceAndDefence(uint8 _teamId, bool _overtime)
        view public returns(uint8 teamOffence, uint8 teamDefence) {
      BLOBPlayer.Player[] memory teamPlayers = getTeamRoster(_teamId);
      uint8 matchRound = SeasonContract.matchRound();

      for (uint8 i=0; i<teamPlayers.length; i++) {
        BLOBPlayer.Player memory player = teamPlayers[i];
        // don't consider player injuries after regular time
        if (_overtime || PlayerContract.CanPlay(player.id, matchRound)) {
          BLOBPlayer.GameTime memory gameTime =
            PlayerContract.GetPlayerGameTime(player.id);

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
      uint[] memory playerIds = TeamContract.GetTeamRosterIds(_teamId);
      players = new BLOBPlayer.Player[](playerIds.length);
      for (uint i=0; i<playerIds.length; i++) {
        players[i] = PlayerContract.GetPlayer(playerIds[i]);
      }
    }

    function getOffenceRatio(uint8 _hostTeam, uint8 _guestTeam, bool _overtime)
        private view returns (uint8 hostOffenceRatio, uint8 guestOffenceRatio) {

      (uint8 hostOffence, uint8 hostDefence) =
          GetTeamOffenceAndDefence(_hostTeam, _overtime);
      (uint8 guestOffence, uint8 guestDefence) =
          GetTeamOffenceAndDefence(_guestTeam, _overtime);
      // uses offence/(rival defence) ratio to decide game positions
      hostOffenceRatio = hostOffence.dividePct(guestDefence);
      guestOffenceRatio = guestOffence.dividePct(hostDefence);
    }

    function getGamePositions(uint8 _hostTeam,
                              uint8 _guestTeam,
                              bool _overtime)
        private view returns (uint8 hostPositions, uint8 hostFreeThrows,
                              uint8 guestPositions, uint8 guestFreeThrows) {
       (uint8 hostORatio, uint8 guestORatio) = getOffenceRatio(_hostTeam,
                                                               _guestTeam,
                                                               _overtime);
      hostPositions = _overtime?
                      TEAM_POSITIONS_OT.multiplyPct(hostORatio) :
                      TEAM_POSITIONS_BASE.multiplyPct(hostORatio)
                        // award teams with winning streak
                        .plusInt8(SeasonContract.teamMomentum(_hostTeam));
      hostFreeThrows = _overtime?
                      TEAM_FREE_THROWS_OT.multiplyPct(hostORatio) :
                      TEAM_FREE_THROWS_BASE.multiplyPct(hostORatio);

      guestPositions = _overtime?
                      TEAM_POSITIONS_OT.multiplyPct(guestORatio) :
                      TEAM_POSITIONS_BASE.multiplyPct(guestORatio)
                        // award teams with winning streak
                        .plusInt8(SeasonContract.teamMomentum(_guestTeam));
      guestFreeThrows = _overtime?
                      TEAM_FREE_THROWS_OT.multiplyPct(guestORatio) :
                      TEAM_FREE_THROWS_BASE.multiplyPct(guestORatio);
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
          // draw a random number between MIN_PLAYER_PERF_PCT and
          // MAX_PLAYER_PERF_PCT for a player's performance fluctuation in every game
          (performanceFactor, seed) = Random.randrange(MIN_PLAYER_PERF_PCT,
                                                       MAX_PLAYER_PERF_PCT, seed);
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
      BLOBPlayer.GameTime memory gameTime = PlayerContract.GetPlayerGameTime(_playerId);

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
                               uint8 _maxShotPct,
                               uint8 _personalGrade,
                               uint8 _performanceFactor)
        private pure returns(uint8 made, uint8 attempts) {
      attempts = _totalAttempts.multiplyPct(_allocation);
      made = attempts.multiplyPct(_maxShotPct
                                   .multiplyPct(_personalGrade)
                                   .multiplyPct(_performanceFactor));
    }
}
