pragma solidity ^0.5.7
import './Player.sol'; 
import './Team.sol'; 

contract League {
    uint8 constant maxTeams = 32;
    uint8[] private teams;
    // team Ids of each season's champion
    uint8[] public champions;

    // the interval in seconds between each round of actions
    // the maximum of uint 16 is about 18 hours, normally should
    // be triggered within 8 hours.
    uint16 roundInterval;
    uint nextSchedulableTime;

    // draft pool
    // only active in the pre-season, once season starts, 
    // unpicked players go to the undrafted pool. 
    uint8[] draftPlayerIds;

    // undrafted players, can be picked up through the season
    uint8[] undraftedPlayerIds;
}