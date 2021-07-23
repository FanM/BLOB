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

    function Init() external leagueOnly {
      LeagueContract = BLOBLeague(RegistryContract.LeagueContract());
      SeasonContract = BLOBSeason(RegistryContract.SeasonContract());
      PlayerContract = BLOBPlayer(RegistryContract.PlayerContract());
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
        addPlayer(_teamId, playerId, curGameTime);
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

    function GetTeamOffenceAndDefence(uint8 _teamId)
        view external returns(uint8 teamOffence, uint8 teamDefence) {
      BLOBPlayer.Player[] memory teamPlayers = getTeamRoster(_teamId);
      uint8 matchRound = SeasonContract.matchRound();

      for (uint8 i=0; i<teamPlayers.length; i++) {
        BLOBPlayer.Player memory player = teamPlayers[i];
        if (PlayerContract.CanPlay(player.id, matchRound)) {
          GameTime memory gameTime = playerToGameTime[player.id];

          uint8 playerPlayTimePct = gameTime.playTime.dividePct(
                                      SeasonContract.MINUTES_IN_MATCH());
          teamOffence += (player.shot / 2
                          + player.shot3Point / 4
                          + player.assist / 4)
                          .multiplyPct(playerPlayTimePct)
                          / 5; // players in each position accounts for 20%

          teamDefence += (player.rebound / 2
                          + player.blockage / 4
                          + player.steal / 4)
                          .multiplyPct(playerPlayTimePct)
                          / 5; // players in each position accounts for 20%
        }
      }
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
      (bool passed, string memory desc) = ValidateTeamPlayerGameTime(teamId);
      require(passed, desc);
    }

    // validate the game time eligibility
    function ValidateTeamPlayerGameTime(uint8 _teamId)
        public view returns(bool passed, string memory desc) {
      BLOBPlayer.Player[] memory teamPlayers = getTeamRoster(_teamId);
      uint8 playableRosterCount = 0;
      uint8 totalShotAllocation = 0;
      uint8 totalShot3PointAllocation = 0;
      uint8[] memory positionMinutes = new uint8[](5);
      uint8 matchRound = SeasonContract.matchRound();
      for (uint8 i=0; i<teamPlayers.length; i++) {
        BLOBPlayer.Player memory player = teamPlayers[i];
        GameTime memory gameTime = playerToGameTime[player.id];
        // 1. player must be eligible for playing, not injured or retired
        if (PlayerContract.CanPlay(player.id, matchRound)) {
          if (gameTime.playTime > 0) {
            playableRosterCount++;
            positionMinutes[uint(player.position)] += gameTime.playTime;

            // 2. shot allocation per player must be less than
            //    MAX_PLAYER_SHOT_ALLOC_PCT
            if (gameTime.shotAllocation + gameTime.shot3PAllocation >
                                                MAX_PLAYER_SHOT_ALLOC_PCT)
              return (false,
                "shot allocation per player must be less than MAX_PLAYER_SHOT_ALLOC_PCT");

            // 3. shot allocation per player must be less than
            //    their play time percentage
            if (gameTime.shotAllocation + gameTime.shot3PAllocation >
                gameTime.playTime.dividePct(SeasonContract.MINUTES_IN_MATCH()))
              return (false,
                "shot allocation per player must be less than their play time percentage");

            totalShotAllocation += gameTime.shotAllocation;
            totalShot3PointAllocation += gameTime.shot3PAllocation;
          }
        }
      }
      // 4. number of players per team must be within
      // [MIN_PLAYERS_ON_ROSTER, MAX_PLAYERS_ON_ROSTER]
      if (playableRosterCount < MIN_PLAYERS_ON_ROSTER
            || playableRosterCount > MAX_PLAYERS_ON_ROSTER)
        return (false,
          "Number of players per team must be within [minPlayersOnRoster, maxPlayersOnRoster]");
      // 5. players of the same position must have play time add up to 48 minutes
      for (uint i=0; i<5; i++) {
        if (positionMinutes[i] != SeasonContract.MINUTES_IN_MATCH())
          return (false,
            "Players of the same position must have play time add up to 48 minutes");
      }
      // 6. total shot & shot3Point allocations must account for 100%
      if (totalShotAllocation != 100 || totalShot3PointAllocation !=100)
        return (false,
          "Total shot & shot3Point allocations must account for 100%");

      return (true, "");
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
      addPlayer(teamId, _playerId, gameTime);
    }

    /*
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

    }
    */

    function addPlayer(uint8 _teamId,
                       uint _playerId,
                       GameTime memory _gameTime)
        private underSalaryCap(_teamId, _playerId) {
      require(
        !teamPlayerExists(_teamId, _playerId),
        "Unexpected! This player is already in this team."
      );
      idToPlayers[_teamId].push(_playerId);
      playerToGameTime[_playerId] = _gameTime;
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
