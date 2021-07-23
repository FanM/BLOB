// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.6;

import './BLOBLeague.sol';
import './BLOBUtils.sol';
import './BLOBRegistry.sol';
import './BLOBTeam.sol';
import './BLOBSeason.sol';
import './ERC721Token.sol';
import './IAgeable.sol';
import './IInjurable.sol';

contract BLOBPlayer is ERC721Token, Ageable, Injurable, WithRegistry {

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
    uint8 constant DEBUT_AGE_MIN = 18;
    uint8 constant DEBUT_AGE_MAX = 22;
    uint8 constant RETIRE_AGE_MIN = 38;
    uint8 constant RETIRE_AGE_MAX = 42;
    uint8 constant PEAK_AGE_MEAN = 30;
    uint8 constant PHY_STRENGTH_INC_UNIT = 2;
    // salary
    uint8 constant STARTING_SALARY_MIN = 5; // 5 million
    uint8 constant STARTING_SALARY_MAX = 10; // 10 million
    uint8 constant SALARY_INC_UNIT = 20; // 20%

    mapping(uint8=>uint8[7]) positionToSkills;

    mapping(uint => Player) private idToPlayer;

    uint8[4] playerGrades = [85, 70, 55, 40];

    // other contracts
    BLOBLeague LeagueContract;
    BLOBSeason SeasonContract;
    BLOBTeam TeamContract;

    constructor(
        string memory _name,
        string memory _symbol,
        string memory _tokenURIBase,
        address _registryContractAddr)
        ERC721Token(_name, _symbol, _tokenURIBase)
        WithRegistry(_registryContractAddr) {

      // takes the max percentage per each position
      // [shot, shot3Point, assist, rebound, blockage, steal, freeThrows]
      positionToSkills[uint8(Position.CENTER)] = [100, 20, 80, 100, 100, 40, 100];
      positionToSkills[uint8(Position.POWER_FORWARD)] = [100, 60, 80, 100, 80, 40, 100];
      positionToSkills[uint8(Position.SMALL_FORWARD)] = [100, 100, 80, 80, 60, 60, 100];
      positionToSkills[uint8(Position.SHOOTING_GUARD)] = [100, 100, 100, 60, 40, 100, 100];
      positionToSkills[uint8(Position.POINT_GUARD)] = [100, 100, 100, 100, 40, 100, 100];
    }

    function Init() external leagueOnly {
      LeagueContract = BLOBLeague(RegistryContract.LeagueContract());
      TeamContract = BLOBTeam(RegistryContract.TeamContract());
      SeasonContract = BLOBSeason(RegistryContract.SeasonContract());
    }

    // Ageable
    function IsRetired(uint _playerId) external override view returns(bool) {
      return idToPlayer[_playerId].retired;
    }

    function UpdatePlayerConditions(uint _seed)
        external override seasonOnly {
      uint8 retireAge;
      (retireAge, _seed) = Random.randrange(RETIRE_AGE_MIN,
                                            RETIRE_AGE_MAX,
                                            _seed);
      for (uint playerId=0; playerId<nextId; playerId++) {
        Player memory player = idToPlayer[playerId];
        // increment age and calculate retirement
        player.age++;
        // reset nextAvailableRound
        player.nextAvailableRound = 0;

        if (!player.retired) {
          if (player.age >= retireAge)
            player.retired = true;

          // update physical strength and salary
          // TODO: adjust salaries based on player performance via a Oracle
          if (player.age < PEAK_AGE_MEAN - 5) {
            // age < 25: physicalStrength increases 4 percentage points,
            //           salary increases 20%
            player.physicalStrength += 2 * PHY_STRENGTH_INC_UNIT;
            player.salary += player.salary.multiplyPct(SALARY_INC_UNIT);

          } else if (player.age >= PEAK_AGE_MEAN - 5
                     && player.age < PEAK_AGE_MEAN) {
            // 25 < age <= 30: physicalStrength increases 2 percentage points,
            //                 salary increases 40%
            player.physicalStrength += PHY_STRENGTH_INC_UNIT;
            player.salary += 2 * player.salary.multiplyPct(SALARY_INC_UNIT);

          } else if (player.age >= PEAK_AGE_MEAN
                     && player.age < PEAK_AGE_MEAN + 5) {
            // 30 < age <= 35: physicalStrength decreases 2 percentage points,
            //                 salary remains the same
            player.salary -= player.salary.multiplyPct(SALARY_INC_UNIT);

          } else if (player.age >= PEAK_AGE_MEAN + 5) {
            // 35 < age: physicalStrength decreases 4 percentage points,
            //           salary decreases 20%
            player.physicalStrength -= 2 * PHY_STRENGTH_INC_UNIT;
            player.salary -= player.salary.multiplyPct(SALARY_INC_UNIT);
          }
        }
        idToPlayer[playerId] = player;
      }
    }
    // End of Ageable

    // Injurable
    function CanPlay(uint _playerId, uint8 _roundId) external override view returns(bool) {
      Player memory player =  idToPlayer[_playerId];
      return !player.retired && player.nextAvailableRound <= _roundId;
    }

    function UpdateNextAvailableRound(uint _playerId,
                                      uint8 _roundId,
                                      uint8 _playTime,
                                      uint8 _performanceFactor)
        external override seasonOnly {
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
      uint seed = block.timestamp;
      for (uint8 i=0; i<_count; i++) {
        (newPlayerIds[i], seed) = mintAPlayer(_position, true, seed);
      }
    }

    // League only
    // returns the array of player ids
    function MintPlayersForTeam()
        external teamOnly returns (uint[] memory newPlayerIds){
      newPlayerIds = new uint[](5*3);
      uint seed = block.timestamp;
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
      (uint8 rnd, uint seed)  = Random.randrange(1, 10, _seed);
      uint8 gradeIndex = 0;
      if (rnd > 1 && rnd <= 3) {
        gradeIndex = 1;
      } else if (rnd > 3 && rnd <= 7) {
        gradeIndex = 2;
      } else {
        gradeIndex = 3;
      }
      // make rookie's debut age between [18, 22], otherwise [18, 37]
      uint8 age;
      // make rookie's starting salary 5, otherwise [5, 10]
      uint8 salary;
      if (_forDraft) {
        (age, seed) = Random.randrange(DEBUT_AGE_MIN, DEBUT_AGE_MAX, seed);
        salary = STARTING_SALARY_MIN;
      } else {
        (age, seed) = Random.randrange(DEBUT_AGE_MIN, RETIRE_AGE_MIN-1, seed);
        (salary, seed) =
          Random.randrange(STARTING_SALARY_MIN, STARTING_SALARY_MAX, seed);
      }
      uint8 gradeBase = playerGrades[gradeIndex];
      uint8[7] memory playerSkillWeights = positionToSkills[uint8(_position)];
      //[physicalStrength, shot, shot3Point, assist, rebound, blockage, steal, freeThrow]
      uint8[] memory playerSkills;
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
          salary: salary
        }
      );
      idToPlayer[nextId] = newPlayer;
      _mint(RegistryContract.TeamContract(), nextId++);
      return (newPlayer.id, seed);
    }
}
