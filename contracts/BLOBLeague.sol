pragma solidity ^0.5.7;
import './BLOBRegistry.sol';
import './BLOBPlayer.sol';
import './BLOBTeam.sol';
import './BLOBSeason.sol';

contract BLOBLeague {
    uint8 public constant MAX_TEAMS = 3;
    uint8 public constant MINUTES_IN_MATCH = 48;
    // the interval in seconds between each round of actions
    // the maximum of uint 16 is about 18 hours, normally should
    // be triggered within 8 hours.
    uint16 public constant RoundInterval = 10;

    address admin;
    bool initialized;
    uint8[] private teams;
    // team Ids of each season's champion
    uint8[] public champions;

    uint nextSchedulableTime;

    // draft pool
    // only active in the pre-season, once season starts,
    // unpicked players go to the undrafted pool.
    uint8[] draftPlayerIds;

    // undrafted players, can be picked up through the season
    uint8[] undraftedPlayerIds;

    // other contracts
    BLOBRegistry RegistryContract;
    BLOBPlayer PlayerContract;
    BLOBTeam TeamContract;
    BLOBSeason SeasonContract;

    constructor(address _registryAddr) public {
      admin = msg.sender;
      RegistryContract = BLOBRegistry(_registryAddr);
    }

    modifier adminOnly() {
      require(msg.sender == admin,
              "Only admin can call this");
      _;
    }

    function InitLeague() external adminOnly {
      if (!initialized) {
        PlayerContract = BLOBPlayer(RegistryContract.PlayerContract());
        TeamContract = BLOBTeam(RegistryContract.TeamContract());
        SeasonContract = BLOBSeason(RegistryContract.SeasonContract());

        // initializes teams
        TeamContract.InitTeam();
        for (uint i=0; i<MAX_TEAMS; i++) {
          TeamContract.CreateTeam();
        }
        initialized = true;
      }
    }

    function ClaimTeam(uint8 _teamId, string calldata _name, string calldata _logoUrl)
        external {
      require(TeamContract.balanceOf(msg.sender) == 0,
              "You can only claim 1 team.");
      require(TeamContract.ownerOf(_teamId) == address(this),
              "Team id is not available for claim.");
      TeamContract.safeTransferFrom(address(this), msg.sender, _teamId, "");
      uint[] memory newPlayerIds = PlayerContract.MintTeamPlayers(_teamId);
      TeamContract.InitTeam(_teamId, _name, _logoUrl, newPlayerIds);
    }

    // admin only
    function NextAction() external adminOnly {
      // call Season.StartSeason
    }

    // only in trade window can exchange players
    function openTradeWindow() private {

    }
}
