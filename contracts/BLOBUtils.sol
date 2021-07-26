// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.6;

import "./BLOBRegistry.sol";
import './BLOBLeague.sol';
import './BLOBPlayer.sol';
import './BLOBTeam.sol';
import './BLOBSeason.sol';

library Random {
  /**
   * @dev Generate random uint <= 256^2
   * @param _seed The seed of psudo random generator
   * @return uint
   */
  function rand(uint _seed) internal view returns (uint) {
      return uint(keccak256(abi.encode(block.timestamp,
                                       block.difficulty,
                                       _seed)));
  }

  /**
   * @dev Generate random uint in range [a, b] with seed
   * @return result The number within the range
   * @return seed The seed for the next call
   */
  function randrange(uint8 _a, uint8 _b, uint _seed)
    internal view returns(uint8 result, uint seed) {
      require(_a < _b, "randrange: _a must be less than _b");
      seed = rand(_seed);
      // turns uint into bytes32
      bytes memory b = new bytes(32);
      assembly { mstore(add(b, 32), seed)}
      // gets the first byte of uint
      result = _a + uint8(b[0]) % (_b - _a);
  }

  /**
   * @dev Generate random uint in range [a, b]
   * @return result
   * @return seed
   */
  function randrange(uint8 _a, uint8 _b) internal view returns(uint8 result, uint seed) {
      (result, seed) = randrange(_a, _b, block.timestamp);
  }

  /**
   * @dev Generate array of random uint8 in range [a, b]
   * @param _size The size of the returned array
   * @param _seed The seed of psudo random generator
   * @return data The number array
   * @return seed The seed for the next call
   */
  function randuint8(uint8 _size, uint8 _a, uint8 _b, uint _seed)
    internal view returns (uint8[] memory data, uint seed) {
      data = new uint8[](_size);
      seed = _seed;
      for(uint8 i; i<_size; i++){
          (data[i], seed) = randrange(_a, _b, seed);
          require(_a <= data[i] && data[i] <= _b, "randuint8: overflow");
      }
  }
}

library Percentage {

  /**
   * @dev get the percentage of num
   * @param _num The number
   * @param _pct The percentage of the number
   * @return uint8
   */
  function multiplyPct(uint8 _num, uint8 _pct) internal pure returns(uint8) {
    uint16 res = uint16(_num) * _pct / 100;
    require(checkValid(res), "multiplyPct param overflow!");
    return uint8(res);
  }

  /**
   * @dev get a as a percentage of b
   * @return uint8
   */
  function dividePct(uint8 _a, uint8 _b) internal pure returns(uint8) {
    require(_b != 0, "Divide by zero");
    uint16 res = uint16(_a) * 100 / _b;
    require(checkValid(res), "dividePct param overflow!");
    return uint8(res);
  }

  /**
   * @dev get val as a divided by (a + b)
   * @return uint8
   */
  function getRatio(uint8 _val, uint8 _a, uint8 _b) internal pure returns(uint8) {
    return multiplyPct(_val, dividePct(_a, _a + _b));
  }

  /**
   * @dev get num plus val, which could be negative
   * @return uint8
   */
  function plusInt8(uint8 _num, int8 _val) internal pure returns(uint8) {
    uint16 res = (_val >= 0) ? uint16(_num) + uint8(_val) : uint16(_num) - uint8(-_val);
    return checkValid(res)? uint8(res) : _num;
  }

  function checkValid(uint16 _data) internal pure returns(bool) {
    return _data >= 0 && _data < 256;
  }
}

library ArrayLib {
  /**
   * @dev get the element indexes of a sorted array in descending order
   * @param _arr The original array
   * @return ranks The indexes array sorted by the elements
   */
  function sortIndexDesc(uint8[] memory _arr)
      internal pure returns(uint8[] memory ranks) {
    ranks = new uint8[](_arr.length);
    for (uint8 i=0; i<_arr.length; i++)
      ranks[i] = i;

    uint8 index;
    uint8 curMax;
    for (uint8 i=0; i<_arr.length; i++) {
      (index, curMax) = (i, _arr[i]);
      for (uint8 j=i+1; j<_arr.length; j++) {
        if (_arr[j] > curMax) {
          (index, curMax) = (j, _arr[j]);
        }
      }
      (_arr[index], _arr[i]) = (_arr[i], curMax);
      (ranks[index], ranks[i]) = (ranks[i], ranks[index]);
    }
  }
}

contract BLOBUtils is WithRegistry {

    using Percentage for uint8;

    BLOBLeague LeagueContract;
    BLOBPlayer PlayerContract;
    BLOBTeam TeamContract;
    BLOBSeason SeasonContract;

    constructor(address _registryAddr)
        WithRegistry(_registryAddr) {
    }

    function Init() external leagueOnly {
      LeagueContract = BLOBLeague(RegistryContract.LeagueContract());
      PlayerContract = BLOBPlayer(RegistryContract.PlayerContract());
      TeamContract = BLOBTeam(RegistryContract.TeamContract());
      SeasonContract = BLOBSeason(RegistryContract.SeasonContract());
    }

    // validate the game time eligibility
    function ValidateTeamPlayerGameTime(uint8 _teamId)
        public view returns(bool passed, string memory desc) {
      BLOBPlayer.Player[] memory teamPlayers = getTeamRoster(_teamId);
      uint8 playableRosterCount = 0;
      uint8 totalShotAllocation = 0;
      uint8 totalShot3PointAllocation = 0;
      uint8[] memory positionMinutes = new uint8[](5);
      uint8 matchRound = SeasonContract.matchRound();
      for (uint8 i=0; i<teamPlayers.length; i++) {
        BLOBPlayer.Player memory player = teamPlayers[i];
        BLOBTeam.GameTime memory gameTime =
          TeamContract.GetPlayerGameTime(player.id);
        // 1. player must be eligible for playing, not injured or retired
        if (PlayerContract.CanPlay(player.id, matchRound)) {
          if (gameTime.playTime > 0) {
            playableRosterCount++;
            positionMinutes[uint(player.position)] += gameTime.playTime;

            // 2. shot allocation per player must be less than
            //    MAX_PLAYER_SHOT_ALLOC_PCT
            if (gameTime.shotAllocation + gameTime.shot3PAllocation >
                  TeamContract.MAX_PLAYER_SHOT_ALLOC_PCT())
              return (false,
                "shot allocation per player must be less than MAX_PLAYER_SHOT_ALLOC_PCT");

            // 3. shot allocation per player must be less than
            //    their play time percentage
            if (gameTime.shotAllocation + gameTime.shot3PAllocation >
                gameTime.playTime.dividePct(SeasonContract.MINUTES_IN_MATCH()))
              return (false,
                "shot allocation per player must be less than their play time percentage");

            totalShotAllocation += gameTime.shotAllocation;
            totalShot3PointAllocation += gameTime.shot3PAllocation;
          }
        }
      }
      // 4. number of players per team must be within
      // [MIN_PLAYERS_ON_ROSTER, MAX_PLAYERS_ON_ROSTER]
      if (playableRosterCount < TeamContract.MIN_PLAYERS_ON_ROSTER()
            || playableRosterCount > TeamContract.MAX_PLAYERS_ON_ROSTER())
        return (false,
          "Number of players per team must be within [minPlayersOnRoster, maxPlayersOnRoster]");
      // 5. players of the same position must have play time add up to 48 minutes
      for (uint i=0; i<5; i++) {
        if (positionMinutes[i] != SeasonContract.MINUTES_IN_MATCH())
          return (false,
            "Players of the same position must have play time add up to 48 minutes");
      }
      // 6. total shot & shot3Point allocations must account for 100%
      if (totalShotAllocation != 100 || totalShot3PointAllocation !=100)
        return (false,
          "Total shot & shot3Point allocations must account for 100%");

      return (true, "");
    }

    function GetTeamOffenceAndDefence(uint8 _teamId)
        view external returns(uint8 teamOffence, uint8 teamDefence) {
      BLOBPlayer.Player[] memory teamPlayers = getTeamRoster(_teamId);
      uint8 matchRound = SeasonContract.matchRound();

      for (uint8 i=0; i<teamPlayers.length; i++) {
        BLOBPlayer.Player memory player = teamPlayers[i];
        if (PlayerContract.CanPlay(player.id, matchRound)) {
          BLOBTeam.GameTime memory gameTime =
            TeamContract.GetPlayerGameTime(player.id);

          uint8 playerPlayTimePct = gameTime.playTime.dividePct(
                                      SeasonContract.MINUTES_IN_MATCH());
          teamOffence += (player.shot / 2
                          + player.shot3Point / 4
                          + player.assist / 4)
                          .multiplyPct(playerPlayTimePct)
                          / 5; // players in each position accounts for 20%

          teamDefence += (player.rebound / 2
                          + player.blockage / 4
                          + player.steal / 4)
                          .multiplyPct(playerPlayTimePct)
                          / 5; // players in each position accounts for 20%
        }
      }
    }

    function getTeamRoster(uint8 _teamId) view internal
      returns(BLOBPlayer.Player[] memory players) {
      players = PlayerContract.GetPlayersByIds(
        TeamContract.GetTeamRosterIds(_teamId));
    }

}
