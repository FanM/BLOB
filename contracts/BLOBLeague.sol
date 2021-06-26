pragma solidity ^0.5.7;
import './BLOBPlayer.sol';
import './BLOBTeam.sol';
import './BLOBSeason.sol';

contract BLOBLeague {
    uint8 public constant maxTeams = 30;
    uint8 public constant minutesInMatch = 48;

    address admin;
    uint8[] private teams;
    // team Ids of each season's champion
    uint8[] public champions;

    // the interval in seconds between each round of actions
    // the maximum of uint 16 is about 18 hours, normally should
    // be triggered within 8 hours.
    uint16 constant roundInterval = 10;
    uint nextSchedulableTime;

    // draft pool
    // only active in the pre-season, once season starts,
    // unpicked players go to the undrafted pool.
    uint8[] draftPlayerIds;

    // undrafted players, can be picked up through the season
    uint8[] undraftedPlayerIds;

    // other contracts
    BLOBPlayer PlayerContract;
    BLOBTeam TeamContract;
    BLOBSeason SeasonContract;

    constructor() public {
      admin = msg.sender;
      PlayerContract = new BLOBPlayer(address(this));
      TeamContract = new BLOBTeam(PlayerContract, address(this));
      SeasonContract = new BLOBSeason(PlayerContract, TeamContract, address(this));
    }
    // admin only
    function NextAction() external {
      // call Season.StartSeason
    }

    // only in trade window can exchange players
    function openTradeWindow() private {

    }
}
