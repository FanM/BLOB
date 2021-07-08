pragma solidity ^0.5.7;
pragma experimental ABIEncoderV2;

import './ERC721Token.sol';
import './BLOBLeague.sol';
import './BLOBPlayer.sol';
import './BLOBSeason.sol';
import './BLOBRegistry.sol';
import './BLOBUtils.sol';

contract BLOBTeam is ERC721Token, LeagueControlled {

    struct Team {
        uint8 id;
        string name;
        string logoUrl;
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

    // for salary cap, in millions, 256 million dollars max should be enough
    uint8 totalTeamSalary;

    // constants
    uint8 constant public TEAM_SALARY_CAP = 100;
    uint8 constant public MAX_PLAYERS_ON_ROSTER = 15;
    uint8 constant public MIN_PLAYERS_ON_ROSTER = 8;
    uint8 constant public MAX_PLAYER_SHOT_ALLOC_PCT = 50;
    uint8 constant public DEFAULT_3POINT_SHOT_PCT = 30;

    mapping(uint8 => Team) private idToTeam;
    mapping(uint8 => uint[]) private idToPlayers; // team players
    mapping(uint => GameTime) private playerToGameTime;

    // other contracts
    BLOBRegistry RegistryContract;
    BLOBLeague LeagueContract;
    BLOBSeason SeasonContract;
    BLOBPlayer PlayerContract;

    constructor(
        string memory _name,
        string memory _symbol,
        string memory _tokenURIBase,
        address _registryContractAddr,
        address _leagueContractAddr)
        ERC721Token(_name, _symbol, _tokenURIBase)
        LeagueControlled(_leagueContractAddr)
        public {
      RegistryContract = BLOBRegistry(_registryContractAddr);
      LeagueContract = BLOBLeague(_leagueContractAddr);
    }

    modifier ownerOnly(uint8 _teamId) {
        require(
          ownerOf(_teamId) == msg.sender,
          "You do not own this team.");
        _;
    }

    modifier seasonOnly() {
        require(
          address(SeasonContract) == msg.sender,
          "Only SeasonContract can call this.");
        _;
    }

    function InitTeam() external leagueOnly {
      SeasonContract = BLOBSeason(RegistryContract.SeasonContract());
      PlayerContract = BLOBPlayer(RegistryContract.PlayerContract());
    }

    function CreateTeam() external leagueOnly returns(uint8) {
      require(nextId < LeagueContract.MAX_TEAMS(),
              "No more teams are available to claim.");
      Team memory newTeam;
      newTeam.id = nextId;

      idToTeam[nextId] = newTeam;
      _mint(msg.sender, nextId);
      nextId++;
      return newTeam.id;
    }

    function InitTeam(uint8 _teamId,
                      string calldata _name,
                      string calldata _logoUrl,
                      uint[] calldata _playerIds)
        external leagueOnly {
      Team storage team = idToTeam[_teamId];
      team.name = _name;
      team.logoUrl = _logoUrl;
      team.shot3PAllocation = DEFAULT_3POINT_SHOT_PCT;

      // initialize players of each position with equal play time
      uint8 averagePlayTime = LeagueContract.MINUTES_IN_MATCH() / 3;
      for (uint8 i=0; i<_playerIds.length; i++) {
        uint playerId = _playerIds[i];
        idToPlayers[_teamId].push(playerId);
        // for simplicity, only gives the first player of each position shots,
        // so everyone has 20% shot allocations
        GameTime memory curGameTime = (i % 3 == 0)?
                                  GameTime({playerId: playerId,
                                            playTime: averagePlayTime,
                                            shotAllocation: 20,
                                            shot3PAllocation: 20
                                          }) :
                                  GameTime({playerId: playerId,
                                            playTime: averagePlayTime,
                                            shotAllocation: 0,
                                            shot3PAllocation: 0
                                          });
        playerToGameTime[playerId] = curGameTime;
      }
    }

    function GetTeam(uint8 _teamId) view external
        returns(Team memory team) {
      team = idToTeam[_teamId];
    }

    function GetPlayerGameTime(uint _playerId) view external
        returns(GameTime memory) {
      return playerToGameTime[_playerId];
    }

    function GetAllTeams() view external returns(Team[] memory teams) {
      uint8 teamCount = LeagueContract.MAX_TEAMS();
      teams = new Team[](teamCount);
      for(uint8 i=0; i<teamCount; i++) {
        teams[i] = idToTeam[i];
      }
    }

    function GetTeamRoster(uint8 _teamId) view public
      returns(BLOBPlayer.Player[] memory players) {
      players = PlayerContract.GetPlayersByIds(idToPlayers[_teamId]);
    }

    function GetTeamOffenceAndDefence(uint8 _teamId)
        view external returns(uint8 teamOffence, uint8 teamDefence) {
      BLOBPlayer.Player[] memory teamPlayers = GetTeamRoster(_teamId);
      uint8 matchRound = SeasonContract.matchRound();

      for (uint8 i=0; i<teamPlayers.length; i++) {
        BLOBPlayer.Player memory player = teamPlayers[i];
        if (PlayerContract.CanPlay(player.id, matchRound)) {
          GameTime memory gameTime = playerToGameTime[player.id];

          uint8 playerPlayTimePct = gameTime.playTime.dividePct(
                                      LeagueContract.MINUTES_IN_MATCH());
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
    function SetPlayersGameTime(uint8 _teamId,
                                GameTime[] calldata _gameTimes)
        external ownerOnly(_teamId) {
      for (uint8 i=0; i<_gameTimes.length; i++) {
        GameTime memory gameTime = _gameTimes[i];
        // checks if the player does belong to this team
        BLOBPlayer.Player memory player = PlayerContract.GetPlayer(
                                            gameTime.playerId, _teamId);
        delete playerToGameTime[player.id];
        playerToGameTime[player.id] = gameTime;
      }
      validateTeamPlayerGameTime(_teamId);
    }

    // validate the game time eligibility
    function validateTeamPlayerGameTime(uint8 _teamId)
        view private {
      BLOBPlayer.Player[] memory teamPlayers = GetTeamRoster(_teamId);
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

            // 2. shot allocation per player must be less than MAX_PLAYER_SHOT_ALLOC_PCT
            if (gameTime.shotAllocation > MAX_PLAYER_SHOT_ALLOC_PCT
                || gameTime.shot3PAllocation > MAX_PLAYER_SHOT_ALLOC_PCT)
                revert("shot allocation per player must be less than MAX_PLAYER_SHOT_ALLOC_PCT");
            totalShotAllocation += gameTime.shotAllocation;
            totalShot3PointAllocation += gameTime.shot3PAllocation;
          }
        }
      }
      // 3. number of players per team must be within
      // [MIN_PLAYERS_ON_ROSTER, MAX_PLAYERS_ON_ROSTER]
      if (playableRosterCount < MIN_PLAYERS_ON_ROSTER
            || playableRosterCount > MAX_PLAYERS_ON_ROSTER)
        revert("Number of players per team must be within [minPlayersOnRoster, maxPlayersOnRoster]");
      // 4. players of the same position must have play time add up to 48 minutes
      for (uint i=0; i<5; i++) {
        if (positionMinutes[i] != LeagueContract.MINUTES_IN_MATCH())
          revert("Players of the same position must have play time add up to 48 minutes");
      }
      // 5. total shot & shot3Point allocations must account for 100%
      if (totalShotAllocation != 100 || totalShot3PointAllocation !=100)
        revert("Total shot & shot3Point allocations must account for 100%");
    }

    // team owner only
    function addNewPlayers(uint8 _teamId, uint8[] calldata players)
        external
        ownerOnly(_teamId) {
        // 1. players must belong to this team in the drafted pool, or in the undrafted pool;
        // 2. must be under the salary cap of this team
    }

}
