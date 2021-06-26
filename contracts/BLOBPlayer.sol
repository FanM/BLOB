pragma solidity ^0.5.7;
import './BLOBLeague.sol';
import './BLOBUtils.sol';
import './ERC721Token.sol';
import './IAgeable.sol';
import './IInjurable.sol';

contract BLOBPlayer is ERC721Token, Ageable, Injurable {

    enum Position {
        CENTER,
        POWER_FORWORD,
        SMALL_FORWORD,
        POINT_GUARD,
        SHOOTING_GUARD
    }

    struct Player {
        // basic profile
        // generates when a player is minted
        uint id;
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

    using Percentage for uint8;

    uint private nextId;

    // injurable
    uint8 constant safePlayMinutesMean = 40;
    // ageable
    uint8 constant debutAgeMean = 20;
    uint8 constant peakAgeMean = 30;
    uint8 constant retireAgeMean = 40;

    mapping(uint8=>uint8) ageToPhysicalStrength;
    mapping(uint8=>uint8[6]) positionToSkills;

    mapping(uint => Player) private idToPlayer;
    mapping(uint => uint) private playerToTeam;

    uint8[4] playerGrades;

    // other contracts
    address leagueContractAddr;
    BLOBLeague LeagueContract;

    constructor(address _leagueContractAddr) public {
      leagueContractAddr = _leagueContractAddr;
      LeagueContract = BLOBLeague(_leagueContractAddr);
      playerGrades = [80, 60, 40, 20];

      // takes the max percentage per each position
      // [shot, shot3Point, assist, rebound, blockage, steal]
      positionToSkills[Position.CENTER] = [100, 20, 80, 60, 100, 100, 40];
      positionToSkills[Position.POWER_FOWARD] = [100, 60, 80, 60, 100, 80, 40];
      positionToSkills[Position.SMALL_FOWARD] = [100, 100, 80, 80, 80, 60, 60];
      positionToSkills[Position.SHOOTING_GUARD] = [100, 100, 100, 60, 60, 40, 100];
      positionToSkills[Position.POINT_GUARD] = [100, 100, 100, 100, 60, 40, 100];
    }

    function GetPlayersByIds(uint8 _teamId, uint8[] _playerIds)
        view external returns (Player[]) {
    }

    // League only
    // returns the array of player ids
    function MintPlayersForDraft(Position _position, uint8 _count)
        external returns (uint8[] memory){
      uint8[] memory newPlayers = new uint8(_count);
      for (uint8 i=0; i<_count; i++) {
        newPlayers.push(mintAPlayer(_position, true));
      }
      return newPlayers;
    }

    // League only
    // returns the array of player ids
    function InitializeTeamPlayers(uint8 _teamId)
        external {
      for (uint i=0; i<5; i++) {
        // mint 3 players per position
        for (uint8 j=0; j<3; j++) {
          uint playerId = mintAPlayer(Position(i), false);
          playerToTeam[playerId] = _teamId;
        }
      }
    }

    function mintAPlayer(Position _position, bool forDraft)
        private returns(uint8) {
      uint rnd = Random.randrange(1, 10);
      uint8 gradeIndex = 0;
      if (rand > 1 && rand <= 3) {
        gradeIndex = 1;
      } else if (rand > 3 && rand <= 7) {
        gradeIndex = 2;
      } else {
        gradeIndex = 3;
      }
      // make rookie's debut age between [18, 22], otherwise [18, 40]
      uint8 age = forDraft?
                    Random.randrange(18, 22, rnd) :
                    Random.randrange(18, 40, rnd);
      uint8 gradeBase = playerGrades[gradeIndex];
      uint8[6] memory playerSkillWeights = positionToSkills[_position];
      // [physicalStrength, shot, shot3Point, assist, rebound, blockage, steal]
      uint8[7] memory playerSkills = Random.randuint8(7, 0, 20, rnd);
      Player newPlayer = Player(
        {
          id: nextId,
          age: _age,
          physicalStrength: gradeBase + playerSkills[0],
          shot: (gradBase + playerSkills[1]).multiplyPct(playerSkillWeights[0]),
          shot3Point: (gradBase + playerSkills[2]).multiplyPct(playerSkillWeights[1]),
          assist: (gradBase + playerSkills[3]).multiplyPct(playerSkillWeights[2]),
          rebound: (gradBase + playerSkills[4]).multiplyPct(playerSkillWeights[3]),
          blockage: (gradBase + playerSkills[5]).multiplyPct(playerSkillWeights[4]),
          steal: (gradBase + playerSkills[6]).multiplyPct(playerSkillWeights[5])
        }
      );
      idToPlayer[nextId] = newPlayer;
      _mint(nextId, leagueContractAddr );
      nextId++;
      return newPlayer.id;
    }
}
