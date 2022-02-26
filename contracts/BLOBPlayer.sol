// SPDX-License-Identifier: MIT

pragma solidity ^0.8.6;

import '@openzeppelin/contracts/token/ERC721/ERC721.sol';
import '@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol';
import './BLOBLeague.sol';
import './BLOBUtils.sol';
import './BLOBRegistry.sol';
import './BLOBTeam.sol';

contract BLOBPlayer is ERC721, ERC721Holder, WithRegistry {

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
        uint8 maturity;
        bool retired;

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
    }

    struct GameTime {
        uint playerId;
        // in minutes, [0, 48]
        uint8 playTime;
        // percentage of shots allocated for this player [0, 50]
        uint8 shotAllocation;
        // percentage of 3 point shots allocated for this player [0, 50]
        uint8 shot3PAllocation;
        // starting lineup
        bool starter;
    }

    event PlayerMinted(
      uint playerId,
      uint seasonId,
      uint8 position,
      uint8 age,
      uint8 physicalStrength,
      uint8 maturity,
      uint8 shot,
      uint8 shot3Point,
      uint8 assist,
      uint8 rebound,
      uint8 blockage,
      uint8 steal,
      uint8 freeThrow,
      bool retired
    );

    event PlayerUpdated(
      uint playerId,
      uint8 age,
      uint8 physicalStrength,
      uint8 maturity,
      bool retired
    );

    using Percentage for uint8;

    uint public nextId;

    // ageable
    uint8 constant DEBUT_AGE_MIN = 18;
    uint8 constant DEBUT_AGE_MAX = 22;
    uint8 constant RETIRE_AGE_MIN = 38;
    uint8 constant RETIRE_AGE_MAX = 42;
    uint8 constant PEAK_AGE_MEAN = 30;
    uint8 constant PHY_STRENGTH_MIN = 50;
    uint8 constant PHY_STRENGTH_MAX = 100;
    uint8 constant PHY_STRENGTH_INC_UNIT = 2;
    uint8 constant DRAFT_MATURITY_MIN = 20;
    uint8 constant DRAFT_MATURITY_MAX = 40;
    uint8 constant DEBUT_MATURITY_MAX = 80;
    uint8 constant MATURITY_MAX = 100;
    uint8 constant MATURITY_INC_UNIT = 2;

    uint8[7][5] positionToSkills;
    uint8[4] playerGrades = [85, 70, 55, 40];

    mapping(uint => Player) private idToPlayer;
    mapping(uint => GameTime) private playerToGameTime;

    // other contracts
    BLOBTeam TeamContract;

    constructor(
        string memory _name,
        string memory _symbol,
        address _registryContractAddr)
        ERC721(_name, _symbol)
        WithRegistry(_registryContractAddr) {

      // takes the max percentage per each position
      // [shot, shot3Point, assist, rebound, blockage, steal, freeThrows]
      positionToSkills[uint8(Position.CENTER)] = [100, 40, 80, 100, 100, 40, 100];
      positionToSkills[uint8(Position.POWER_FORWARD)] = [100, 60, 80, 100, 80, 40, 100];
      positionToSkills[uint8(Position.SMALL_FORWARD)] = [100, 100, 80, 80, 60, 60, 100];
      positionToSkills[uint8(Position.SHOOTING_GUARD)] = [100, 100, 80, 60, 40, 100, 100];
      positionToSkills[uint8(Position.POINT_GUARD)] = [100, 100, 100, 60, 40, 100, 100];
    }

    modifier playerExists(uint _playerId) {
      require(
        _exists(_playerId),
        uint8(BLOBLeague.ErrorCode.INVALID_PLAYER_ID).toStr()
      );
      _;
    }

    function Init() external leagueOnly {
      TeamContract = BLOBTeam(RegistryContract.TeamContract());
    }

    // Ageable
    function IsRetired(uint _playerId) external view returns(bool) {
      return idToPlayer[_playerId].retired;
    }

    function UpdatePlayerConditions(uint _playerId,
                                    uint16 _playerSeasonMinutesAvg,
                                    uint16 _playMinutesInSeason,
                                    uint _seed)
      external seasonOnly returns(uint seed) {
      Player storage player = idToPlayer[_playerId];
      if (!player.retired) {
        uint8 playTimePct = Percentage.dividePctU16(
          _playMinutesInSeason,
          _playerSeasonMinutesAvg);
        // update physical strength and maturity
        uint8 physicalStrength = player.physicalStrength;
        uint8 maturity = player.maturity;
        if (player.age < PEAK_AGE_MEAN - 5) {
          // age < 25: physicalStrength increases 4 percentage points
          physicalStrength += 2 * PHY_STRENGTH_INC_UNIT;
          maturity += (3 * MATURITY_INC_UNIT).multiplyPct(playTimePct);

        } else if (player.age >= PEAK_AGE_MEAN - 5
                   && player.age < PEAK_AGE_MEAN) {
          // 25 <= age < 30: physicalStrength increases 2 percentage points
          physicalStrength += PHY_STRENGTH_INC_UNIT;
          maturity += (2 * MATURITY_INC_UNIT).multiplyPct(playTimePct);

        } else if (player.age >= PEAK_AGE_MEAN
                   && player.age < PEAK_AGE_MEAN + 5) {
          // 30 <= age < 35: physicalStrength decreases 2 percentage points,
          physicalStrength -= PHY_STRENGTH_INC_UNIT;
          maturity += MATURITY_INC_UNIT.multiplyPct(playTimePct);

        } else if (player.age >= PEAK_AGE_MEAN + 5) {
          // 35 <= age: physicalStrength decreases 4 percentage points,
          physicalStrength -= 2 * PHY_STRENGTH_INC_UNIT;
        }
        if (physicalStrength > PHY_STRENGTH_MAX)
          player.physicalStrength = PHY_STRENGTH_MAX;
        else if (physicalStrength < PHY_STRENGTH_MIN)
          player.physicalStrength = PHY_STRENGTH_MIN;
        else
          player.physicalStrength = physicalStrength;

        player.maturity = maturity > MATURITY_MAX ? MATURITY_MAX : maturity;

        // increment age and calculate retirement
        uint8 retireAge;
        (retireAge, seed) = Random.randrange(RETIRE_AGE_MIN,
                                             RETIRE_AGE_MAX,
                                             _seed);
        player.age++;
        if (player.age >= retireAge)
          player.retired = true;

        emit PlayerUpdated(
          _playerId,
          player.age,
          player.physicalStrength,
          player.maturity,
          player.retired);
      }
    }

    function mintPlayers(uint[] memory newPlayerIds,
                         uint _seasonId,
                         uint8 _countPerPosistion,
                         bool _forDraft,
                         uint _seed) private returns (uint){
      for (uint i=0; i<5; i++) {
        for (uint8 j=0; j<_countPerPosistion; j++) {
          uint playerId;
          (playerId, _seed) = mintAPlayer(Position(i), _forDraft , _seasonId, _seed+j);
          newPlayerIds[i*_countPerPosistion + j] = playerId;
        }
      }
      return _seed;
    }

    function MintPlayersForDraft(uint _seasonId, uint8 _countPerPosistion)
        external seasonOnly returns (uint[] memory newPlayerIds){
      newPlayerIds = new uint[](5 * _countPerPosistion);
      // mint 2 players for each position and another 2 players for random position
      uint seed = block.timestamp;
      mintPlayers(newPlayerIds, _seasonId, _countPerPosistion, true, seed);
    }

    function MintPlayersForTeam(uint _seasonId,
                                uint8 _countPerPosistion,
                                uint8 _countAdditional)
        external teamOnly returns (uint[] memory newPlayerIds){
      // mint 2 players for each position and another 2 players for random position
      newPlayerIds = new uint[](5 * _countPerPosistion + _countAdditional);
      uint seed = block.timestamp;
      seed = mintPlayers(newPlayerIds, _seasonId, _countPerPosistion, false, seed);
      uint playerId;
      for (uint i=0; i<_countAdditional; i++) {
        (playerId, seed) = mintAPlayer(Position(seed % 5), false, _seasonId, seed);
        newPlayerIds[5 * _countPerPosistion + i] = playerId;
      }
    }

    function GetPlayer(uint _playerId)
        view external playerExists(_playerId) returns(Player memory player) {
      player = idToPlayer[_playerId];
    }

    function GetPlayerGameTime(uint _playerId)
        view external playerExists(_playerId)
        returns(BLOBPlayer.GameTime memory playerGameTime) {
      playerGameTime = playerToGameTime[_playerId];
    }

    function SetPlayerGameTime(GameTime calldata _gameTime)
        external teamOnly {
      delete playerToGameTime[_gameTime.playerId];
      playerToGameTime[_gameTime.playerId] = _gameTime;
    }

    function tokenURI(uint256 tokenId)
        public view override playerExists(tokenId)
        returns(string memory) {
      return idToPlayer[tokenId].photoUrl;
    }

    function SetPlayerNameAndImage(uint _playerId,
                                   string memory _name,
                                   string memory _photoUrl)
        external teamOnly playerExists(_playerId) {

      Player storage player = idToPlayer[_playerId];
      require(
        keccak256(abi.encodePacked(player.name)) == keccak256(abi.encodePacked(""))
        && keccak256(abi.encodePacked(player.photoUrl)) == keccak256(abi.encodePacked("")),
        uint8(BLOBLeague.ErrorCode.PLAYER_NAME_IMAGE_ALREADY_SET).toStr()
      );
      player.name = _name;
      player.photoUrl = _photoUrl;
    }

    function TransferPlayer(uint _playerId, address _to)
        external teamOnly {
      Player memory player = idToPlayer[_playerId];
      require(
        player.retired,
        uint8(BLOBLeague.ErrorCode.PLAYER_NOT_ABLE_TO_CLAIM).toStr()
      );
      _safeTransfer(RegistryContract.TeamContract(), _to, _playerId, "");
    }

    function getGradeIndex(uint _seed)
        private view returns(uint8 gradeIndex, uint seed) {
      uint8 rnd;
      (rnd, seed)  = Random.randrange(1, 10, _seed);
      gradeIndex = 0;             // top 10%
      if (rnd > 1 && rnd <= 3) {
        gradeIndex = 1;           // 20%
      } else if (rnd > 3 && rnd <= 8) {
        gradeIndex = 2;           // 50%
      } else if (rnd > 8) {
        gradeIndex = 3;           // bottom 20%
      }
    }

    function getOffenceDefenceGradeBase(uint _seed)
        private view returns(uint8 offenceGradeBase, uint8 defenceGradeBase, uint seed) {
      uint8 offenceGrade;
      (offenceGrade, seed) = getGradeIndex(_seed);
      uint8 defenceGrade;
      (defenceGrade, seed) = getGradeIndex(seed);
      offenceGradeBase = playerGrades[offenceGrade];
      defenceGradeBase = playerGrades[defenceGrade];
    }

    function mintAPlayer(Position _position, bool _forDraft, uint _seasonId, uint _seed)
        private returns(uint playerId, uint seed) {
      uint8 offenceGradeBase;
      uint8 defenceGradeBase;
      (offenceGradeBase, defenceGradeBase, seed) = getOffenceDefenceGradeBase(_seed);
      // make rookie's debut age between [18, 22], otherwise [18, 37]
      uint8 age;
      // make rookie's maturity between [DEBUT_MATURITY_MIN , DEBUT_MATURITY_MAX],
      // otherwise [DEBUT_MATURITY_MAX, MATURITY_MAX]
      uint8 maturity;
      if (_forDraft) {
        (age, seed) = Random.randrange(DEBUT_AGE_MIN, DEBUT_AGE_MAX, seed);
        (maturity, seed) = Random.randrange(DRAFT_MATURITY_MIN, DRAFT_MATURITY_MAX, seed);
      } else {
        (age, seed) = Random.randrange(DEBUT_AGE_MIN, RETIRE_AGE_MIN-1, seed);
        (maturity, seed) = Random.randrange(DRAFT_MATURITY_MAX, DEBUT_MATURITY_MAX, seed);
      }
      uint8 physicalStrength;
      (physicalStrength, seed) = Random.randrange(PHY_STRENGTH_MIN, PHY_STRENGTH_MAX, seed);
      //[shot, shot3Point, assist, rebound, blockage, steal, freeThrow]
      uint8[] memory playerSkills;
      (playerSkills, seed) = Random.randuint8(7, 0, 15, seed);
      Player memory newPlayer = addPlayerAttributes(nextId,
                                               _position,
                                               age,
                                               physicalStrength,
                                               maturity,
                                               offenceGradeBase,
                                               defenceGradeBase,
                                               playerSkills);
      idToPlayer[nextId] = newPlayer;
      playerId = nextId;
      _safeMint(RegistryContract.TeamContract(), nextId++);
      emit PlayerMinted(
        playerId,
        _seasonId,
        uint8(_position),
        age,
        physicalStrength,
        maturity,
        newPlayer.shot,
        newPlayer.shot3Point,
        newPlayer.assist,
        newPlayer.rebound,
        newPlayer.blockage,
        newPlayer.steal,
        newPlayer.freeThrow,
        false
      );
    }

    function addPlayerAttributes(uint _id,
                                 Position _position,
                                 uint8 _age,
                                 uint8 _physicalStrength,
                                 uint8 _maturity,
                                 uint8 _offenceGradeBase,
                                 uint8 _defenceGradeBase,
                                 uint8[] memory _playerSkills)
        private view returns(Player memory newPlayer) {
      uint8[7] memory playerSkillWeights = positionToSkills[uint8(_position)];
      newPlayer = Player(
        {
          id: _id,
          name: "",
          photoUrl: "",
          retired: false,
          age: _age,
          position: _position,
          physicalStrength: _physicalStrength,
          maturity: _maturity,
          shot: (_offenceGradeBase + uint8(_playerSkills[0])).multiplyPct(playerSkillWeights[0]),
          shot3Point: (_offenceGradeBase + uint8(_playerSkills[1])).multiplyPct(playerSkillWeights[1]),
          assist: (_offenceGradeBase + uint8(_playerSkills[2])).multiplyPct(playerSkillWeights[2]),
          rebound: (_defenceGradeBase + uint8(_playerSkills[3])).multiplyPct(playerSkillWeights[3]),
          blockage: (_defenceGradeBase + uint8(_playerSkills[4])).multiplyPct(playerSkillWeights[4]),
          steal: (_defenceGradeBase + uint8(_playerSkills[5])).multiplyPct(playerSkillWeights[5]),
          freeThrow: (_offenceGradeBase + uint8(_playerSkills[6])).multiplyPct(playerSkillWeights[6])
        }
      );
    }
}
