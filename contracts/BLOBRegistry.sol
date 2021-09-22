// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.6;

import './BLOBLeague.sol';
import './BLOBUtils.sol';

contract BLOBRegistry {
    address admin;
    address public LeagueContract;
    address public TeamContract;
    address public PlayerContract;
    address public SeasonContract;
    address public MatchContract;

    using Percentage for uint8;

    constructor() {
      admin = msg.sender;
    }

    modifier adminOnly() {
      require(
        msg.sender == admin,
        uint8(BLOBLeague.ErrorCode.LEAGUE_ADMIN_ONLY).toStr()
      );
      _;
    }

    function SetLeagueContract(address _league) external adminOnly {
      assert(LeagueContract == address(0));
      LeagueContract = _league;
    }

    function SetTeamContract(address _team) external adminOnly {
      assert(TeamContract == address(0));
      TeamContract = _team;
    }

    function SetPlayerContract(address _player) external adminOnly {
      assert(PlayerContract == address(0));
      PlayerContract = _player;
    }

    function SetSeasonContract(address _season) external adminOnly {
      assert(SeasonContract == address(0));
      SeasonContract = _season;
    }

    function SetMatchContract(address _match) external adminOnly {
      assert(MatchContract == address(0));
      MatchContract = _match;
    }
}

abstract contract WithRegistry {

    using Percentage for uint8;

    BLOBRegistry RegistryContract;

    constructor(address _registryContractAddr) {
      RegistryContract = BLOBRegistry(_registryContractAddr);
    }

    modifier leagueOnly() {
      require(
        RegistryContract.LeagueContract() == msg.sender,
        uint8(BLOBLeague.ErrorCode.LEAGUE_CONTRACT_ONLY).toStr()
      );
      _;
    }

    modifier teamOnly() {
      require(
        RegistryContract.TeamContract() == msg.sender,
        uint8(BLOBLeague.ErrorCode.TEAM_CONTRACT_ONLY).toStr()
      );
      _;
    }

    modifier seasonOnly() {
      require(
        RegistryContract.SeasonContract() == msg.sender,
        uint8(BLOBLeague.ErrorCode.SEASON_CONTRACT_ONLY).toStr()
      );
      _;
    }

    modifier matchOnly() {
      require(
        RegistryContract.MatchContract() == msg.sender,
        uint8(BLOBLeague.ErrorCode.MATCH_CONTRACT_ONLY).toStr()
      );
      _;
    }
}
