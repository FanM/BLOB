pragma solidity ^0.5.7;
import './BLOBRegistry.sol';
import './BLOBPlayer.sol';
import './BLOBTeam.sol';
import './BLOBSeason.sol';

contract BLOBLeague is WithRegistry {
    uint8 public constant MAX_TEAMS = 10;
    uint8 public constant MINUTES_IN_MATCH = 48;
    // the interval in seconds between each round of actions
    // the maximum of uint 16 is about 18 hours, normally should
    // be triggered within 8 hours.
    uint16 public constant RoundInterval = 10;

    address admin;
    bool initialized;

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

    constructor(address _registryAddr)
        public
        WithRegistry(_registryAddr) {
      admin = msg.sender;
    }

    modifier adminOnly() {
      require(msg.sender == admin,
              "Only admin can call this");
      _;
    }

    function Init() external adminOnly {
      if (!initialized) {
        PlayerContract = BLOBPlayer(RegistryContract.PlayerContract());
        TeamContract = BLOBTeam(RegistryContract.TeamContract());
        SeasonContract = BLOBSeason(RegistryContract.SeasonContract());

        // initializes contracts
        SeasonContract.Init();
        TeamContract.Init();
        PlayerContract.Init();
        initialized = true;
      }
    }

    function ClaimTeam(string calldata _name, string calldata _logoUrl)
        external {
      require(TeamContract.balanceOf(msg.sender) == 0,
              "You can only claim 1 team.");
      require(SeasonContract.seasonState() == BLOBSeason.SeasonState.Offseason,
              "You can only claim team in the offseason.");

      uint8 teamId = TeamContract.CreateTeam(msg.sender);
      uint[] memory newPlayerIds = PlayerContract.MintTeamPlayers(teamId);
      TeamContract.InitTeam(teamId, _name, _logoUrl, newPlayerIds);
    }

    // admin only
    function StartSeason() external adminOnly {
      SeasonContract.StartSeason();
    }

    // admin only
    function PlayMatch() external adminOnly {
      SeasonContract.PlayMatch();
    }

    // only in trade window can exchange players
    function openTradeWindow() private {

    }
}
