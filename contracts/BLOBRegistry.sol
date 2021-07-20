pragma solidity ^0.5.7;

contract BLOBRegistry {
    //address public LeagueContract;
    address public TeamContract;
    address public PlayerContract;
    address public SeasonContract;

    function SetTeamContract(address _team) external {
      require(
        TeamContract == address(0),
        "Team Contract was set already."
      );
      TeamContract = _team;
    }

    function SetPlayerContract(address _player) external {
      require(
        PlayerContract == address(0),
        "Player Contract was set already."
      );
      PlayerContract = _player;
    }

    function SetSeasonContract(address _season) external {
      require(
        SeasonContract == address(0),
        "Season Contract was set already."
      );
      SeasonContract = _season;
    }
}

contract WithRegistry {
    BLOBRegistry RegistryContract;

    constructor(address _registryContractAddr) public {
      RegistryContract = BLOBRegistry(_registryContractAddr);
    }
}
