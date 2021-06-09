pragma solidity ^0.5.7;
import './ERC721Token.sol'; 
import './IAgeable.sol'; 
import './IInjurable.sol'; 

contract Player is ERC721Token, Ageable, Injurable {

    enum Position {
        CENTER,
        SMALL_FORWORD,
        POWER_FORWORD,
        POINT_GUARD,
        SHOOTING_GUARD
    }

    // injurable
    uint8 constant safePlayMinutesMean = 40;
    // ageable
    uint8 constant debutAgeMean = 20;
    uint8 constant peakAgeMean = 30;
    uint8 constant retireAgeMean = 40;
    mapping(uint8=>uint8) ageToPhysicalStrength;

    struct player {
        // basic profile
        // generates when a player is minted
        uint id;
        uint8 height;
        uint8 weight;
        Position position;

        string name;
        string photoUrl;

        // ageable
        uint8 age;
        uint8 physicalStrength;
        //uint8 mentalStrength;
        booll retired;

        // injurable
        uint8 nextAvailableRound;

        // offence skills: [1, 100]
        // generates when a player is minted
        uint8 shot;
        uint8 shot3Point;
        uint8 assist;

        // defence skills: [1, 100]
        // generates when a player is minted
        uint8 rebound;
        uint8 blockage;
        uint8 steal;

        // for salary cap, in millions
        // 0 for unsigned players
        uint8 salary;

    }

    mapping(uint => Player) private idToPlayer;
    uint public nextId;
    mapping(uint => uint) private playerToTeam;

    function GetPlayersByIds(uint8 _teamId, uint8[] _playerIds) 
        view external returns (Player[]) {
    }

    // only League can call this
    // returns the array of player ids
    function MintPlayersForDraft(Position _posistion, uint8 _count) 
        external returns (uint8[]){
        // 
    }

    // only League can call this
    // returns the array of player ids
    function InitializeTeamPlayers(uint8 _teamId) 
        external {
        // 
    }
}



