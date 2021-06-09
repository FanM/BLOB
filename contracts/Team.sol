pragma solidity ^0.5.7;
import './ERC721Token.sol'; 
import './Player.sol'; 

contract Team is ERC721Token {

    struct Team {
        uint8 id;
        string name;
        string logoUrl;
        uint8[] playerIds; 
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
    // team id
    uint public nextId;

    // for salary cap, in millions, 256 million dollars max should be enough
    uint8 totalTeamSalary;
    // 
    uint8 constant teamSalaryCap = 100;
    uint8 constant maxPlayersOnRoster = 15;
    uint8 constant minPlayersOnRoster = 8;

    mapping(uint => Team) private idToTeam;
    mapping(uint => GameTime) private playerGameTime;

    function getAllTeams() view external returns(Team[]) {
    }

    function getTeamPlayers(uint8 _teamId) view external returns(Player[]) {
        // call Player.getPlayersByIds with team playerIds
    }

    function getTeamActivePlayers(uint8 _teamId) view external returns(Player[]) {
        // get all players eligible for play a game
    }

    // team owner only
    function setPlayersGameTime(uint8 _teamId, GameTime[] _gameTimes) 
        external {
        // 1. player must be eligible for playing, not injured or retired
        // 2. players of the same position must have play time add up to 48
        // 3. number of players per team must be within [minPlayersOnRoster, maxPlayersOnRoster]
    }

    // team owner only
    function addNewPlayers(uint8 _teamId, uint8[] players) external {
        // 1. players must belong to this team in the drafted pool, or in the undrafted pool;
        // 2. must be under the salary cap of this team
    }

}