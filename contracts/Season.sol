pragma solidity ^0.5.7
import './Player.sol'; 
import './Team.sol'; 

contract Season {

    event Match (
        uint matchId,
        uint8 hostTeam,
        uint8 guestTeam,
        uint8 hostScore,
        uint8 guestScore
    );

    event PlayerStat (
        uint8 matchId,
        uint8 playerId,
        uint8 minutes,
        uint8 points,
        uint8 shotPct,
        uint8 shot3PointPct,
        uint8 freeThrowPct,
        uint8 assists,
        uint8 rebounds,
        uint8 blockages,
        uint8 steals
    );

    // constants
    uint8 constant maxMatchRounds = 82;

    // season id
    uint public seasonId;

    // match id
    uint private matchId;

    // match round
    uint8 matchRound

    // match list
    uint8[maxMatchRounds][] matchList;

    // the number of wins each team has
    // use to track team ranking
    mapping(uint8=>uint8) teamWins;


    // league only 
    function scheduleNextRound() external {

    }

    function playMatchAndUpdateResult(uint8 hostId, uint guessId) private {

    }


}