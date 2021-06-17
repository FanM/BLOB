pragma solidity ^0.5.7;
import './ERC721Token.sol';
import './IAgeable.sol';
import './IInjurable.sol';
import './BLOBLeague.sol';
import './BLOBUtils.sol';

contract BLOBPlayer is ERC721Token, Ageable, Injurable {

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

    uint8[4] playerGrades = [80, 60, 40, 20];

    struct Player {
        // basic profile
        // generates when a player is minted
        uint id;
        Position position;

        //string name;
        //string photoUrl;

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

    uint private nextId;
    mapping(uint => Player) private idToPlayer;
    mapping(uint => uint) private playerToTeam;

    // other contracts
    address leagueContractAddr;
    BLOBLeague LeagueContract;

    constructor(address _leagueContractAddr) public {
      leagueContractAddr = _leagueContractAddr;
      LeagueContract = BLOBLeague(_leagueContractAddr);
    }

    function GetPlayersByIds(uint8 _teamId, uint8[] _playerIds)
        view external returns (Player[]) {
    }

    // League only
    // returns the array of player ids
    function MintPlayersForDraft(Position _posistion, uint8 _count)
        external returns (uint8[]){
        //
    }

    // League only
    // returns the array of player ids
    function InitializeTeamPlayers(uint8 _teamId)
        external {
        //
    }

    function mintAPlayer(Position _posistion)
        private {
      uint rnd = Random.randrange(1, 10);
      uint8 gradeIndex = 0;
      if (rand > 1 && rand <= 3) {
        gradeIndex = 1;
      } else if (rand > 3 && rand <= 7) {
        gradeIndex = 2;
      } else {
        gradeIndex = 3;
      }
      uint8 gradeBase = playerGrades[gradeIndex];
      // [physicalStrength, shot, shot3Point, assist, rebound, blockage, steal]
      uint8[7] memory playerSkills = Random.randuint8(7, 0, 20, rnd);
      Player newPlayer = Player({id: nextId,
                                 physicalStrength: gradeBase + playerSkills[0]});
    }
}
