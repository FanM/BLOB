pragma solidity ^0.5.7;
pragma experimental ABIEncoderV2;

import './BLOBLeague.sol';
import './BLOBUtils.sol';
import './BLOBRegistry.sol';
import './BLOBSeason.sol';
import './ERC721Token.sol';
import './IAgeable.sol';
import './IInjurable.sol';

contract BLOBPlayer is ERC721Token, Ageable, Injurable,
                        LeagueControlled, WithRegistry {

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

        uint8 freeThrow;

        // for salary cap, in millions
        // 0 for unsigned players
        uint8 salary;
    }

    using Percentage for uint8;

    uint private nextId;

    // injurable
    uint8 constant SAFE_PLAY_MINUTES_MEAN = 40;
    // ageable
    uint8 constant DEBUT_AGE_MEAN = 20;
    uint8 constant PEAK_AGE_MEAN = 30;
    uint8 constant RETIRE_AGE_MEAN = 40;
    uint8 constant PHY_STRENGTH_INC_UNIT = 2;

    mapping(uint8=>uint8[7]) positionToSkills;

    mapping(uint => Player) private idToPlayer;

    uint8[4] playerGrades;

    // other contracts
    BLOBLeague LeagueContract;
    BLOBSeason SeasonContract;

    constructor(
        string memory _name,
        string memory _symbol,
        string memory _tokenURIBase,
        address _registryContractAddr,
        address _leagueContractAddr)
        ERC721Token(_name, _symbol, _tokenURIBase)
        LeagueControlled(_leagueContractAddr)
        WithRegistry(_registryContractAddr)
        public {
      LeagueContract = BLOBLeague(_leagueContractAddr);
      playerGrades = [85, 70, 55, 40];

      // takes the max percentage per each position
      // [shot, shot3Point, assist, rebound, blockage, steal, freeThrows]
      positionToSkills[uint8(Position.CENTER)] = [100, 20, 80, 100, 100, 40, 100];
      positionToSkills[uint8(Position.POWER_FORWARD)] = [100, 60, 80, 100, 80, 40, 100];
      positionToSkills[uint8(Position.SMALL_FORWARD)] = [100, 100, 80, 80, 60, 60, 100];
      positionToSkills[uint8(Position.SHOOTING_GUARD)] = [100, 100, 100, 60, 40, 100, 100];
      positionToSkills[uint8(Position.POINT_GUARD)] = [100, 100, 100, 100, 40, 100, 100];
    }

    modifier seasonOnly() {
        require(
          address(SeasonContract) == msg.sender,
          "Only SeasonContract can call this.");
        _;
    }

    function Init() external leagueOnly {
      SeasonContract = BLOBSeason(RegistryContract.SeasonContract());
    }

    // Ageable
    function IsRetired(uint _playerId) view external returns(bool) {
      return idToPlayer[_playerId].retired;
    }

    function UpdatePlayerPhysicalCondition(uint _seed) external seasonOnly {
      int rnd;
      (rnd, _seed) = Random.randrange(-1, 1, _seed);
      for (uint playerId=0; playerId<nextId; playerId++) {
        Player memory player = idToPlayer[playerId];
        // increment age and calculate retirement
        player.age++;
        // reset nextAvailableRound
        player.nextAvailableRound = 0;

        if (!player.retired) {
          if (player.age >= RETIRE_AGE_MEAN.plusInt8(int8(rnd)))
            player.retired = true;

          // update physical strength
          if (player.age < PEAK_AGE_MEAN - 5) {
            player.physicalStrength = player.physicalStrength.plusInt8(
                                        int8(2 * PHY_STRENGTH_INC_UNIT));
          } else if (player.age >= PEAK_AGE_MEAN - 5
                     && player.age < PEAK_AGE_MEAN) {
            player.physicalStrength = player.physicalStrength.plusInt8(
                                        int8(PHY_STRENGTH_INC_UNIT));
          } else if (player.age >= PEAK_AGE_MEAN
                     && player.age < PEAK_AGE_MEAN + 5) {
            player.physicalStrength = player.physicalStrength.plusInt8(
                                        int8(-PHY_STRENGTH_INC_UNIT));
          } else if (player.age >= PEAK_AGE_MEAN + 5) {
            player.physicalStrength = player.physicalStrength.plusInt8(
                                        -2 * int8(PHY_STRENGTH_INC_UNIT));
          }
        }
        idToPlayer[playerId] = player;
      }
    }
    // End of Ageable

    // Injurable
    function CanPlay(uint _playerId, uint8 _roundId) view external returns(bool) {
      Player memory player =  idToPlayer[_playerId];
      return !player.retired && player.nextAvailableRound <= _roundId;
    }

    function UpdateNextAvailableRound(uint _playerId,
                                      uint8 _roundId,
                                      uint8 _playTime,
                                      uint8 _performanceFactor)
        external seasonOnly {
      uint8 nextAvailableRound = _roundId + 1;
      // _safePlayTime randomly falls in [90%, 110%] range of
      // SAFE_PLAY_MINUTES_MEAN, weighted by player physicalStrength
      uint8 safePlayTime = SAFE_PLAY_MINUTES_MEAN
                                .multiplyPct(_performanceFactor)
                                .multiplyPct(idToPlayer[_playerId].physicalStrength);
      if (_playTime < safePlayTime) {
        // if the _playTime is less than safePlayTime, a player has 10% chance
        // of missing 1 game
        if ((safePlayTime - _playTime) % 10 == 0)
          nextAvailableRound++;
      } else {
        uint8 diff = _playTime - safePlayTime;
        if (diff % 5 == 0) {
          // 20% chance of missing 1 game
          nextAvailableRound++;
        } else if (diff % 7 == 0) {
          // one seventh chance of missing 5 games
          nextAvailableRound += 5;
        } else if (diff % 9 == 0) {
          // one nineth chance of missing 10 games
          nextAvailableRound += 10;
        } else if (diff % 11 == 0) {
          // one eleventh chance of missing 20 games
          nextAvailableRound += 20;
        }
      }
      idToPlayer[_playerId].nextAvailableRound = nextAvailableRound;
    }
    // End of Injurable

    function GetPlayersByIds(uint[] calldata _playerIds)
        view external returns (Player[] memory players) {
        players = new Player[](_playerIds.length);
        for (uint i=0; i<_playerIds.length; i++) {
          players[i] = idToPlayer[_playerIds[i]];
        }
    }

    // returns the array of player ids
    function MintPlayersForDraft(Position _position, uint8 _count)
        external leagueOnly returns (uint[] memory newPlayerIds){
      newPlayerIds = new uint[](_count);
      uint seed = now;
      for (uint8 i=0; i<_count; i++) {
        (newPlayerIds[i], seed) = mintAPlayer(_position, true, seed);
      }
    }

    // League only
    // returns the array of player ids
    function MintPlayersForTeam()
        external leagueOnly returns (uint[] memory newPlayerIds){
      newPlayerIds = new uint[](5*3);
      uint seed = now;
      for (uint i=0; i<5; i++) {
        // mint 3 players per position
        for (uint8 j=0; j<3; j++) {
          uint playerId;
          (playerId, seed)  = mintAPlayer(Position(i), false, seed);
          newPlayerIds[i*3 + j] = playerId;
        }
      }
    }

    function GetPlayer(uint _playerId) view external returns(Player memory player) {
      player = idToPlayer[_playerId];
      require(
        player.id == _playerId,
        "GetPlayer: invalid player Id."
      );
    }

    function mintAPlayer(Position _position, bool _forDraft, uint _seed)
        private returns(uint, uint) {
      (int rnd, uint seed)  = Random.randrange(1, 10, _seed);
      uint8 gradeIndex = 0;
      if (rnd > 1 && rnd <= 3) {
        gradeIndex = 1;
      } else if (rnd > 3 && rnd <= 7) {
        gradeIndex = 2;
      } else {
        gradeIndex = 3;
      }
      // make rookie's debut age between [18, 22], otherwise [20, 40]
      uint8 age;
      int result;
      if (_forDraft) {
        (result, seed) = Random.randrange(-2, 2, seed);
        age = DEBUT_AGE_MEAN + uint8(result);
      } else {
        (result, seed) = Random.randrange(DEBUT_AGE_MEAN, RETIRE_AGE_MEAN, seed);
        age = uint8(result);
      }
      uint8 gradeBase = playerGrades[gradeIndex];
      uint8[7] memory playerSkillWeights = positionToSkills[uint8(_position)];
      //[physicalStrength, shot, shot3Point, assist, rebound, blockage, steal, freeThrow]
      int8[] memory playerSkills;
      (playerSkills, seed) = Random.randuint8(8, 0, 15, seed);
      Player memory newPlayer = Player(
        {
          id: nextId,
          name: "",
          photoUrl: "",
          retired: false,
          nextAvailableRound: 0,
          age: age,
          position: _position,
          physicalStrength: gradeBase + uint8(playerSkills[0]),
          shot: (gradeBase + uint8(playerSkills[1])).multiplyPct(playerSkillWeights[0]),
          shot3Point: (gradeBase + uint8(playerSkills[2])).multiplyPct(playerSkillWeights[1]),
          assist: (gradeBase + uint8(playerSkills[3])).multiplyPct(playerSkillWeights[2]),
          rebound: (gradeBase + uint8(playerSkills[4])).multiplyPct(playerSkillWeights[3]),
          blockage: (gradeBase + uint8(playerSkills[5])).multiplyPct(playerSkillWeights[4]),
          steal: (gradeBase + uint8(playerSkills[6])).multiplyPct(playerSkillWeights[5]),
          freeThrow: (gradeBase + uint8(playerSkills[7])).multiplyPct(playerSkillWeights[6]),
          salary: 0
        }
      );
      idToPlayer[nextId] = newPlayer;
      _mint(RegistryContract.TeamContract(), nextId);
      nextId++;
      return (newPlayer.id, seed);
    }
}
