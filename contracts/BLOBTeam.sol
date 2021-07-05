pragma solidity ^0.5.7;
pragma experimental ABIEncoderV2;

import './ERC721Token.sol';
import './BLOBLeague.sol';
import './BLOBPlayer.sol';
import './BLOBSeason.sol';
import './BLOBUtils.sol';

contract BLOBTeam is ERC721Token {

    struct Team {
        uint8 id;
        string name;
        string logoUrl;
        uint[] playerIds;
        uint8 momentum; // +/- of team wins
    }

    struct GameTime {
        uint playerId;
        // in minutes, [0, 48]
        uint8 playTime;

        // percentage of shots allocated for this player, [0, 100] subject to maximum
        // play time
        uint8 shotAllocation;
        // percentage of 3 point shots allocated for this player, [0, 100] subject to maximum
        // play time
        uint8 shot3PAllocation;
    }

    using Percentage for uint8;

    // League contract address
    address leagueContractAddr;
    // team id
    uint8 nextId;

    // for salary cap, in millions, 256 million dollars max should be enough
    uint8 totalTeamSalary;

    // constants
    uint8 constant public teamSalaryCap = 100;
    uint8 constant public maxPlayersOnRoster = 15;
    uint8 constant public minPlayersOnRoster = 8;

    mapping(uint => Team) private idToTeam;
    mapping(uint => GameTime) private playerToGameTime;

    // other contracts
    BLOBLeague LeagueContract;
    BLOBPlayer PlayerContract;

    constructor(
        string memory _name,
        string memory _symbol,
        string memory _tokenURIBase,
        address _playerContractAddr,
        address _leagueContractAddr)
        ERC721Token(_name, _symbol, _tokenURIBase)
        public {
      leagueContractAddr = _leagueContractAddr;
      LeagueContract = BLOBLeague(_leagueContractAddr);
      PlayerContract = BLOBPlayer(_playerContractAddr);
    }

    modifier leagueOnly {
      require(
        msg.sender == leagueContractAddr,
        "TeamContract: Only League contract can call this!"
      );
      _;
    }

    modifier ownerOnly(uint8 _teamId) {
        require(
          ownerOf(_teamId) == msg.sender,
          "You do not own this team.");
        _;
    }

    function CreateTeam() external leagueOnly returns(uint8) {
      require(nextId < LeagueContract.maxTeams(),
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
      team.playerIds = _playerIds;
      team.name = _name;
      team.logoUrl = _logoUrl;

      // initialize players of each position with equal play time
      uint8 averagePlayTime = LeagueContract.minutesInMatch() / 3;
      for (uint8 i=0; i<_playerIds.length; i++) {
        uint playerId = _playerIds[i];
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
        returns(Team memory) {
      return idToTeam[_teamId];
    }

    function GetPlayerGameTime(uint _playerId) view external
        returns(GameTime memory) {
      return playerToGameTime[_playerId];
    }

    function GetAllTeams() view external returns(Team[] memory teams) {
      uint8 teamCount = LeagueContract.maxTeams();
      teams = new Team[](teamCount);
      for(uint i=0; i<teamCount; i++) {
        teams[i] = idToTeam[i];
      }
    }

    function GetTeamRoster(uint8 _teamId) view public
      returns(BLOBPlayer.Player[] memory players) {
      Team memory team = idToTeam[_teamId];
      players = PlayerContract.GetPlayersByIds(team.playerIds);
    }

    function GetTeamOffence(uint8 _teamId, uint8 _roundId)
        view external returns(uint8 teamOffence) {
      BLOBPlayer.Player[] memory teamPlayers = GetTeamRoster(_teamId);
      teamOffence = 0;
      for (uint8 i=0; i<teamPlayers.length; i++) {
        BLOBPlayer.Player memory player = teamPlayers[i];
        if (PlayerContract.CanPlay(player.id, _roundId)) {
          GameTime memory gameTime = playerToGameTime[player.id];

          uint8 playerPlayTimePct = gameTime.playTime.dividePct(
                                      LeagueContract.minutesInMatch());
          teamOffence += (player.shot / 2
                          + player.shot3Point / 4
                          + player.assist / 4)
                          .multiplyPct(playerPlayTimePct)
                          .multiplyPct(20); // players in each position accounts
                                            // for 20%
        }
      }
    }

    function GetTeamDefence(uint8 _teamId, uint8 _roundId)
        view external returns(uint8 teamDefence) {
      BLOBPlayer.Player[] memory teamPlayers = GetTeamRoster(_teamId);
      teamDefence = 0;
      for (uint8 i=0; i<teamPlayers.length; i++) {
        BLOBPlayer.Player memory player = teamPlayers[i];
        if (PlayerContract.CanPlay(player.id, _roundId)) {
          GameTime memory gameTime = playerToGameTime[player.id];
          uint8 playerPlayTimePct = gameTime.playTime.dividePct(
                                      LeagueContract.minutesInMatch());
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
        // only checks if the player does belong to this team
        // defers the game time eligibility check to match
        BLOBPlayer.Player memory player = PlayerContract.GetPlayer(
                                            gameTime.playerId, _teamId);
        delete playerToGameTime[player.id];
        playerToGameTime[player.id] = gameTime;
      }
    }

    function VerifyTeamPlayerGameTime(uint8 _teamId, uint8 _roundId)
        view public returns(bool) {
      BLOBPlayer.Player[] memory teamPlayers = GetTeamRoster(_teamId);
      uint8 playableRosterCount = 0;
      uint8 totalShotAllocation = 0;
      uint8 totalShot3PointAllocation = 0;
      uint8[] memory positionMinutes = new uint8[](5);
      for (uint8 i=0; i<teamPlayers.length; i++) {
        BLOBPlayer.Player memory player = teamPlayers[i];
        GameTime memory gameTime = playerToGameTime[player.id];
        // 1. player must be eligible for playing, not injured or retired
        if (PlayerContract.CanPlay(player.id, _roundId)) {
          if (gameTime.playTime > 0) {
            playableRosterCount++;
            positionMinutes[uint(player.position)] += gameTime.playTime;
            totalShotAllocation += gameTime.shotAllocation;
            totalShot3PointAllocation += gameTime.shot3PAllocation;
          }
        }
      }
      // 2. number of players per team must be within [minPlayersOnRoster, maxPlayersOnRoster]
      if (playableRosterCount < minPlayersOnRoster
            || playableRosterCount > maxPlayersOnRoster)
        return false;
      // 3. players of the same position must have play time add up to 48 minutes
      for (uint i=0; i<5; i++) {
        if (positionMinutes[i] != LeagueContract.minutesInMatch())
          return false;
      }
      // 4. total shot & shot3Point allocations must account for 100%
      if (totalShotAllocation != 100 || totalShot3PointAllocation !=100)
        return false;

      return true;
    }

    // team owner only
    function addNewPlayers(uint8 _teamId, uint8[] calldata players)
        external
        ownerOnly(_teamId) {
        // 1. players must belong to this team in the drafted pool, or in the undrafted pool;
        // 2. must be under the salary cap of this team
    }

}
