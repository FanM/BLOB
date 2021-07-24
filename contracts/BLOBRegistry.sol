// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.6;

contract BLOBRegistry {
    address admin;
    address public LeagueContract;
    address public TeamContract;
    address public PlayerContract;
    address public SeasonContract;
    address public UtilsContract;

    constructor() {
      admin = msg.sender;
    }

    modifier adminOnly() {
      require(msg.sender == admin,
              "Only admin can call this");
      _;
    }

    function SetLeagueContract(address _league) external adminOnly {
      require(
        LeagueContract == address(0),
        "League Contract was set already."
      );
      LeagueContract = _league;
    }

    function SetTeamContract(address _team) external adminOnly {
      require(
        TeamContract == address(0),
        "Team Contract was set already."
      );
      TeamContract = _team;
    }

    function SetPlayerContract(address _player) external adminOnly {
      require(
        PlayerContract == address(0),
        "Player Contract was set already."
      );
      PlayerContract = _player;
    }

    function SetSeasonContract(address _season) external adminOnly {
      require(
        SeasonContract == address(0),
        "Season Contract was set already."
      );
      SeasonContract = _season;
    }

    function SetUtilsContract(address _utils) external adminOnly {
      require(
        UtilsContract == address(0),
        "Utils Contract was set already."
      );
      UtilsContract = _utils;
    }
}

abstract contract WithRegistry {
    BLOBRegistry RegistryContract;

    constructor(address _registryContractAddr) {
      RegistryContract = BLOBRegistry(_registryContractAddr);
    }

    modifier leagueOnly() {
      require(
        RegistryContract.LeagueContract() == msg.sender,
        "Only league can call this.");
      _;
    }

    modifier teamOnly() {
      require(
        RegistryContract.TeamContract()  == msg.sender,
        "Only TeamContract can call this.");
      _;
    }

    modifier seasonOnly() {
      require(
        RegistryContract.SeasonContract() == msg.sender,
        "Only SeasonContract can call this.");
      _;
    }
}
