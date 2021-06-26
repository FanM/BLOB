pragma solidity ^0.5.7;
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
        uint8[] playerIds;
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
    uint nextId;

    // for salary cap, in millions, 256 million dollars max should be enough
    uint8 totalTeamSalary;

    // constants
    uint8 constant public teamSalaryCap = 100;
    uint8 constant public maxPlayersOnRoster = 15;
    uint8 constant public minPlayersOnRoster = 8;

    mapping(uint => Team) private idToTeam;
    mapping(uint => GameTime) private playerGameTime;

    // other contracts
    BLOBLeague LeagueContract;
    BLOBPlayer PlayerContract;

    constructor(BLOBPlayer _blobPlayer, address _leagueContractAddr) public {
      LeagueContract = BLOBLeague(_leagueContractAddr);
      PlayerContract = _blobPlayer;
    }

    function ClaimTeam() external {
      require(nextId < LeagueContract.maxTeams());
      uint8[] memory newPlayerIds = PlayerContract.InitializeTeamPlayers(nextId);

      // initialize players of each position with equal play time
      uint8 averagePlayTime = LeagueContract.minitesInMatch() / 3;
      for (uint8 i=0; i<newPlayerIds.length; i++) {
        uint playerId = newPlayerIds[i].id;
        // for simplicity, only gives the first player of each position shots,
        // so everyone has 20% shot allocations
        GameTime playerGameTime = (i % 3 == 0)?
                                  GameTime({playerId: playerId,
                                            playTime: averagePlayTime,
                                            shotAllocation: 20,
                                            shot3PAllocation: 20
                                          }) :
                                  GameTime({playerId: playerId,
                                            playTime: averagePlayTime
                                          });
        playerGameTime[playerId] = playerGameTime;
      }

      Team newTeam = Team(
        {
          id: nextId,
          playerIds: newPlayerIds
        }
      );
      idToTeam[nextId] = newTeam;
      _mint(nextId, msg.sender);
      nextId++;
    }

    function GetAllTeams() view external returns(Team[] memory) {
    }

    function GetTeamPlayers(uint8 _teamId) view external returns(Player[] memory) {
        // call Player.getPlayersByIds with team playerIds
    }

    function GetTeamRoster(uint8 _teamId) view external returns(Player[] memory) {
        // get all active players for a team
    }

    function GetTeamOffence(uint8 _teamId) view external returns(uint8) {
        Player[] memory teamPlayers = GetTeamRoster(_teamId);
        uint16 teamOffence = 0;
        for (uint8 i=0; i<teamPlayers.length; i++) {
          Player memory player = teamPlayers[i];
          GameTime memory gameTime = playerGameTime[player.id];
          uint16 playerPlayTimePct = gameTime.playTime.dividePct(
                                      SeasonContract.MinutesInMatch());
          teamOffence += (player.shot / 2 + player.shot3Point / 4
                          + player.assist / 4).multiplyPct(playerPlayTimePct);
        }
    }

    // team owner only
    function SetPlayersGameTime(uint8 _teamId, GameTime[] _gameTimes)
        external {
        // 1. player must be eligible for playing, not injured or retired
        // 2. players of the same position must have play time add up to 48
        // 3. number of players per team must be within
        //    [minPlayersOnRoster, maxPlayersOnRoster]
    }

    // team owner only
    function addNewPlayers(uint8 _teamId, uint8[] players) external {
        // 1. players must belong to this team in the drafted pool, or in the undrafted pool;
        // 2. must be under the salary cap of this team
    }

}
