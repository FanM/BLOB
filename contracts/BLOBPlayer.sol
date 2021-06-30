pragma solidity ^0.5.7;
pragma experimental ABIEncoderV2;

import './BLOBLeague.sol';
import './BLOBUtils.sol';
import './ERC721Token.sol';
import './IAgeable.sol';
import './IInjurable.sol';

contract BLOBPlayer is ERC721Token, Ageable, Injurable {

    enum Position {
        CENTER,
        POWER_FORWARD,
        SMALL_FORWARD,
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
        bool retired;

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
      positionToSkills[uint8(Position.CENTER)] = [100, 20, 80, 100, 100, 40];
      positionToSkills[uint8(Position.POWER_FORWARD)] = [100, 60, 80, 100, 80, 40];
      positionToSkills[uint8(Position.SMALL_FORWARD)] = [100, 100, 80, 80, 60, 60];
      positionToSkills[uint8(Position.SHOOTING_GUARD)] = [100, 100, 100, 60, 40, 100];
      positionToSkills[uint8(Position.POINT_GUARD)] = [100, 100, 100, 100, 40, 100];
    }

    function GetPlayersByIds(uint8 _teamId, uint8[] calldata _playerIds)
        view external returns (Player[] memory players) {
        players = new Player[](_playerIds.length);
        for (uint i=0; i<_playerIds.length; i++) {
          players[i] = idToPlayer[_playerIds[i]];
        }
    }

    // League only
    // returns the array of player ids
    function MintPlayersForDraft(Position _position, uint8 _count)
        external returns (uint[] memory newPlayers){
      newPlayers = new uint[](_count);
      for (uint8 i=0; i<_count; i++) {
        newPlayers[i] = mintAPlayer(_position, true);
      }
    }

    // League only
    // returns the array of player ids
    function InitializeTeamPlayers(uint8 _teamId)
        external returns (uint[] memory newPlayerIds){
      newPlayerIds = new uint[](5*3);
      for (uint i=0; i<5; i++) {
        // mint 3 players per position
        for (uint8 j=0; j<3; j++) {
          uint playerId = mintAPlayer(Position(i), false);
          playerToTeam[playerId] = _teamId;
          newPlayerIds[i*3 + j] = playerId;
        }
      }
    }

    function mintAPlayer(Position _position, bool forDraft)
        private returns(uint) {
      uint rnd = Random.randrange(1, 10);
      uint8 gradeIndex = 0;
      if (rnd > 1 && rnd <= 3) {
        gradeIndex = 1;
      } else if (rnd > 3 && rnd <= 7) {
        gradeIndex = 2;
      } else {
        gradeIndex = 3;
      }
      // make rookie's debut age between [18, 22], otherwise [18, 40]
      uint8 age = forDraft?
                    uint8(Random.randrange(18, 22, rnd)) :
                    uint8(Random.randrange(18, 40, rnd));
      uint8 gradeBase = playerGrades[gradeIndex];
      uint8[6] memory playerSkillWeights = positionToSkills[uint8(_position)];
      // [physicalStrength, shot, shot3Point, assist, rebound, blockage, steal]
      uint8[] memory playerSkills = Random.randuint8(7, 0, 20, rnd);
      Player memory newPlayer = Player(
        {
          id: nextId,
          name: "",
          photoUrl: "",
          retired: false,
          nextAvailableRound: 0,
          age: age,
          position: _position,
          physicalStrength: gradeBase + playerSkills[0],
          shot: (gradeBase + playerSkills[1]).multiplyPct(playerSkillWeights[0]),
          shot3Point: (gradeBase + playerSkills[2]).multiplyPct(playerSkillWeights[1]),
          assist: (gradeBase + playerSkills[3]).multiplyPct(playerSkillWeights[2]),
          rebound: (gradeBase + playerSkills[4]).multiplyPct(playerSkillWeights[3]),
          blockage: (gradeBase + playerSkills[5]).multiplyPct(playerSkillWeights[4]),
          steal: (gradeBase + playerSkills[6]).multiplyPct(playerSkillWeights[5]),
          salary: 0
        }
      );
      idToPlayer[nextId] = newPlayer;
      _mint(leagueContractAddr, nextId);
      nextId++;
      return newPlayer.id;
    }
}
