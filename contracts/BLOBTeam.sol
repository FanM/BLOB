// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.6;

import './ERC721Token.sol';
import './BLOBLeague.sol';
import './BLOBPlayer.sol';
import './BLOBSeason.sol';
import './BLOBRegistry.sol';
import './BLOBUtils.sol';

contract BLOBTeam is ERC721Token, WithRegistry {

    struct Team {
        uint8 id;
        string name;
        string logoUrl;
        uint8 teamSalary; // for salary cap, in millions
        uint8 shot3PAllocation; // 3 point shots percentage in total shots
    }

    struct GameTime {
        uint playerId;
        // in minutes, [0, 48]
        uint8 playTime;

        // percentage of shots allocated for this player [0, 50]
        uint8 shotAllocation;
        // percentage of 3 point shots allocated for this player [0, 50]
        uint8 shot3PAllocation;
    }

    using Percentage for uint8;

    // team id
    uint8 nextId;

    // constants
    uint8 constant public MAX_TEAMS = 10;
    uint8 constant public TEAM_SALARY_CAP = 200;
    uint8 constant public MAX_PLAYERS_ON_ROSTER = 15;
    uint8 constant public MIN_PLAYERS_ON_ROSTER = 8;
    uint8 constant public MAX_PLAYER_SHOT_ALLOC_PCT = 50;
    uint8 constant public DEFAULT_3POINT_SHOT_PCT = 30;

    mapping(uint8 => Team) private idToTeam;
    mapping(address => uint8) private ownerToTeamId;
    mapping(uint8 => uint[]) private idToPlayers; // team players
    mapping(uint => GameTime) private playerToGameTime;

    // other contracts
    BLOBLeague LeagueContract;
    BLOBSeason SeasonContract;
    BLOBPlayer PlayerContract;
    BLOBUtils UtilsContract;

    constructor(
        string memory _name,
        string memory _symbol,
        string memory _tokenURIBase,
        address _registryContractAddr)
        ERC721Token(_name, _symbol, _tokenURIBase)
        WithRegistry(_registryContractAddr) {}

    modifier ownTeam() {
      require(
        ownerToTokenCount[msg.sender] == 1,
        "You must own a team in the first place.");
        _;
    }

    modifier underSalaryCap(uint8 _teamId, uint _playerId) {
      require(
        TEAM_SALARY_CAP >=
        idToTeam[_teamId].teamSalary + PlayerContract.GetPlayer(_playerId).salary,
        "Exceeded the salary cap of this team."
      );
      _;
    }

    modifier initiatedByMe(uint _txId) {
      uint8 myTeamId = MyTeamId();
      BLOBLeague.TradeTx memory tradeTx = LeagueContract.GetTradeTx(_txId);
      require(
        tradeTx.initiatorTeam == myTeamId,
        "Can only act on transactions placed by your own team."
      );
      _;
    }

    modifier proposedToMe(uint _txId) {
      uint8 myTeamId = MyTeamId();
      BLOBLeague.TradeTx memory tradeTx = LeagueContract.GetTradeTx(_txId);
      require(
        tradeTx.counterpartyTeam == myTeamId,
        "Can only act on transactions proposed to your own team."
      );
      _;
    }

    function Init() external leagueOnly {
      LeagueContract = BLOBLeague(RegistryContract.LeagueContract());
      SeasonContract = BLOBSeason(RegistryContract.SeasonContract());
      PlayerContract = BLOBPlayer(RegistryContract.PlayerContract());
      UtilsContract = BLOBUtils(RegistryContract.UtilsContract());
    }

    function ClaimTeam(string calldata _name, string calldata _logoUrl)
        external {
      require(nextId < MAX_TEAMS,
              "No more teams are available to claim.");
      require(ownerToTokenCount[msg.sender] == 0,
              "You can only claim 1 team.");
      require(SeasonContract.seasonState() == BLOBSeason.SeasonState.Offseason,
              "You can only claim team in the offseason.");

      //uint8 teamId = TeamContract.CreateTeam(msg.sender);
      Team memory newTeam;
      newTeam.id = nextId;

      _mint(msg.sender, nextId);
      idToTeam[nextId] = newTeam;
      ownerToTeamId[msg.sender] = nextId++;

      uint[] memory newPlayerIds = PlayerContract.MintPlayersForTeam();
      initTeam(newTeam.id, _name, _logoUrl, newPlayerIds);
    }

    function initTeam(uint8 _teamId,
                      string memory _name,
                      string memory _logoUrl,
                      uint[] memory _playerIds) private {
      Team storage team = idToTeam[_teamId];
      team.name = _name;
      team.logoUrl = _logoUrl;
      team.shot3PAllocation = DEFAULT_3POINT_SHOT_PCT;

      // initialize players of each position with equal play time
      uint8 averagePlayTime = SeasonContract.MINUTES_IN_MATCH() / 3;
      for (uint8 i=0; i<_playerIds.length; i++) {
        uint playerId = _playerIds[i];
        // for simplicity, gives 5 players 10% shots each, and 5% shots for
        // the rest of 10 players
        GameTime memory curGameTime = (i % 3 == 0)?
                                  GameTime({playerId: playerId,
                                            playTime: averagePlayTime,
                                            shotAllocation: 10,
                                            shot3PAllocation: 10
                                          }) :
                                  GameTime({playerId: playerId,
                                            playTime: averagePlayTime,
                                            shotAllocation: 5,
                                            shot3PAllocation: 5
                                          });
        addPlayer(_teamId, playerId);
        playerToGameTime[playerId] = curGameTime;
      }
    }

    function MyTeamId()
        view public ownTeam returns(uint8) {
      return idToTeam[ownerToTeamId[msg.sender]].id;
    }

    function GetTeam(uint8 _teamId) view external
        returns(Team memory team) {
      team = idToTeam[_teamId];
      require(
        team.id == _teamId,
        "GetTeam: invalid Team Id."
      );
    }

    function GetPlayerGameTime(uint _playerId) view external
        returns(GameTime memory playerGameTime) {
      playerGameTime = playerToGameTime[_playerId];
      require(
        playerGameTime.playerId == _playerId,
        "GetPlayerGameTime: invalid playerId."
      );
    }

    function GetTeamCount() view external returns(uint8) {
      return nextId;
    }

    function GetTeamRosterIds(uint8 _teamId) view public
        returns(uint[] memory) {
      require(
        _teamId < nextId,
        "GetTeamRosterIds: Team Id out of bound."
      );
      return idToPlayers[_teamId];
    }

    function getTeamRoster(uint8 _teamId) view internal
      returns(BLOBPlayer.Player[] memory players) {
      players = PlayerContract.GetPlayersByIds(idToPlayers[_teamId]);
    }

    // team owner only
    function SetPlayersGameTime(GameTime[] calldata _gameTimes)
        external {
      uint8 teamId = MyTeamId();
      for (uint8 i=0; i<_gameTimes.length; i++) {
        GameTime memory gameTime = _gameTimes[i];
        // checks if the player does belong to this team
        require(
          teamPlayerExists(teamId, _gameTimes[i].playerId),
          "This player does not belong to this team."
        );
        BLOBPlayer.Player memory player = PlayerContract.GetPlayer(
                                                          gameTime.playerId);
        delete playerToGameTime[player.id];
        playerToGameTime[player.id] = gameTime;
      }
      (bool passed, string memory desc) = UtilsContract.ValidateTeamPlayerGameTime(teamId);
      require(passed, desc);
    }

    // when a player is retired, its team owner can claim its ownership
    function ClaimPlayer(uint _playerId) external {
      uint8 myTeamId = MyTeamId();
      // checks if this player belongs to my team
      require(
        teamPlayerExists(myTeamId, _playerId),
        "This player does not belong to this team."
      );
      BLOBPlayer.Player memory player = PlayerContract.GetPlayer(_playerId);
      require(
        player.retired,
        "Cannot claim a player if it is not retired."
      );
      PlayerContract.safeTransferFrom(address(this), msg.sender, _playerId, "");
      removePlayer(myTeamId, _playerId);
    }

    function DraftPlayer(uint _playerId) external {
      uint8 teamId = MyTeamId();
      LeagueContract.CheckAndPickDraftPlayer(_playerId, teamId);
      GameTime memory gameTime = GameTime({playerId: _playerId,
                                           playTime: 0,
                                           shotAllocation: 0,
                                           shot3PAllocation: 0});
      addPlayer(teamId, _playerId);
      playerToGameTime[_playerId] = gameTime;
    }

    function PlaceTradeTx(uint8 _otherTeamId,
                          uint[] calldata _playersToSell,
                          uint[] calldata _playersToBuy) external {
      uint8 myTeamId = MyTeamId();
      // verify _playersToSell are indeed my team players
      require(
        teamPlayersExist(myTeamId, _playersToSell),
        "Cannot sell players not on your team."
      );
      // verify _playersToBuy are from the other team
      require(
        teamPlayersExist(_otherTeamId, _playersToBuy),
        "Can only buy players from the other team."
      );
      LeagueContract.PlaceTradeTx(myTeamId,
                                  _otherTeamId,
                                  _playersToSell,
                                  _playersToBuy);
    }

    function CancelTradeTx(uint _txId) external initiatedByMe(_txId) {
      LeagueContract.CancelTradeTx(_txId);
    }

    function RejectTradeTx(uint _txId) external proposedToMe(_txId) {
      LeagueContract.RejectTradeTx(_txId);
    }

    function AcceptTradeTx(uint _txId) external proposedToMe(_txId) {
      BLOBLeague.TradeTx memory acceptedTx = LeagueContract.AcceptTradeTx(_txId);
      // Since we don't know if those players from the initiator team
      // are still available as they may have been traded in other transactions,
      // we can only rely on the check on remve/add players.
      for (uint8 i=0; i<acceptedTx.initiatorPlayers.length; i++)
        removePlayer(acceptedTx.initiatorTeam, acceptedTx.initiatorPlayers[i]);
      for (uint8 i=0; i<acceptedTx.counterpartyPlayers.length; i++)
        addPlayer(acceptedTx.counterpartyTeam, acceptedTx.counterpartyPlayers[i]);
    }

    function addPlayer(uint8 _teamId,
                       uint _playerId)
        private underSalaryCap(_teamId, _playerId) {
      require(
        !teamPlayerExists(_teamId, _playerId),
        "Unexpected! This player is already in this team."
      );
      idToPlayers[_teamId].push(_playerId);
      idToTeam[_teamId].teamSalary += PlayerContract.GetPlayer(_playerId).salary;
    }

    function removePlayer(uint8 _teamId,
                          uint _playerId)
        private {
      uint[] memory teamPlayerIds = idToPlayers[_teamId];
      uint8 index = uint8(teamPlayerIds.length);
      for (uint8 i=0; i<teamPlayerIds.length; i++) {
        if (_playerId == teamPlayerIds[i]) {
          index = i;
          break;
        }
      }
      if (index != teamPlayerIds.length) {
        // found the player
        idToPlayers[_teamId][index] = teamPlayerIds[teamPlayerIds.length-1];
        idToPlayers[_teamId].pop();
        idToTeam[_teamId].teamSalary -= PlayerContract.GetPlayer(_playerId).salary;
      } else {
        revert("removePlayer: this player does not belong to this team.");
      }
    }

    function teamPlayersExist(uint8 _teamId, uint[] memory _playerIds)
        private view returns(bool) {
      if (_playerIds.length == 0)
        return false;
      for (uint8 i=0; i<_playerIds.length; i++) {
        if (!teamPlayerExists(_teamId, _playerIds[i]))
          return false;
      }
      return true;
    }

    function teamPlayerExists(uint8 _teamId, uint _playerId)
        private view returns(bool) {
      uint[] memory teamPlayerIds = idToPlayers[_teamId];
      for (uint8 i=0; i<teamPlayerIds.length; i++) {
        if (_playerId == teamPlayerIds[i]) {
          return true;
        }
      }
      return false;
    }
}
