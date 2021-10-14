// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.6;

import './BLOBLeague.sol';

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
    uint16 res = uint16(_a) * 100 / _b;
    require(checkValid(res), "dividePct param overflow!");
    return uint8(res);
  }

  /**
   * @dev get a as a percentage of b
   * @return uint16
   */
  function dividePctU16(uint16 _a, uint16 _b) internal pure returns(uint8) {
    uint32 res = uint32(_a) * 100 / _b;
    require(checkValid(res), "dividePct param overflow!");
    return uint8(res);
  }

  /**
   * @dev get a as a percentage of b with a limit of _max
   * @return uint8
   */
  function dividePctMax(uint8 _a, uint8 _b, uint8 _max) internal pure returns(uint8) {
    uint16 res = uint16(_a) * 100 / _b;
    return res > _max? _max : uint8(res);
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

  function checkValid(uint _data) internal pure returns(bool) {
    return _data >= 0 && _data < 256;
  }

  function toStr(uint8 _i)
      internal pure returns (string memory _uintAsString) {
    if (_i == 0) {
      return "0";
    }
    uint8 j = _i;
    uint8 len;
    while (j != 0) {
      len++;
      j /= 10;
    }
    bytes memory bstr = new bytes(len);
    while (_i != 0) {
      len--;
      uint8 temp = (48 + uint8(_i % 10));
      bstr[len] = bytes1(temp);
      _i /= 10;
    }
    return string(bstr);
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

contract BLOBUtils {

  mapping (uint8 => string) public errorCodeDescription;

  constructor() {
      initErrorCodeDesc();
  }

  function initErrorCodeDesc() private {
    errorCodeDescription[uint8(BLOBLeague.ErrorCode.PLAYER_EXCEED_SHOT_ALLOC)] =
      "Shot allocation per player must be less than MAX_PLAYER_SHOT_ALLOC_PCT";
    errorCodeDescription[uint8(BLOBLeague.ErrorCode.PLAYER_EXCEED_TIME_ALLOC)] =
      "Shot allocation per player must be less than their play time percentage";
    errorCodeDescription[uint8(BLOBLeague.ErrorCode.TEAM_LESS_THAN_MIN_ROSTER)] =
      "Number of players per team must be more than MIN_PLAYERS_ON_ROSTER";
    errorCodeDescription[uint8(BLOBLeague.ErrorCode.TEAM_MORE_THAN_MAX_ROSTER)] =
      "Number of players per team must be less than MAX_PLAYERS_ON_ROSTER";
    errorCodeDescription[uint8(BLOBLeague.ErrorCode.TEAM_POS_TIME_ALLOC_INVALID)] =
      "Players of the same position must have play time add up to 48 minutes";
    errorCodeDescription[uint8(BLOBLeague.ErrorCode.TEAM_NOT_ENOUGH_STARTERS)] =
      "Starter in each position must be playable";
    errorCodeDescription[uint8(BLOBLeague.ErrorCode.TEAM_REDUNDANT_STARTERS)] =
      "Each position can have only one starter";
    errorCodeDescription[uint8(BLOBLeague.ErrorCode.TEAM_INSUFFICIENT_2P_SHOT_ALLOC)] =
      "Total 2-point shot allocations must sum up to 100%";
    errorCodeDescription[uint8(BLOBLeague.ErrorCode.TEAM_INSUFFICIENT_3P_SHOT_ALLOC)] =
      "Total 3-point shot allocations must sum up to 100%";
    errorCodeDescription[uint8(BLOBLeague.ErrorCode.TRADE_INITIATED_BY_ME_ONLY)] =
      "Can only act on transactions initiated by your own team";
    errorCodeDescription[uint8(BLOBLeague.ErrorCode.TRADE_PROPOSED_TO_ME_ONLY)] =
      "Can only act on transactions proposed to your own team";
    errorCodeDescription[uint8(BLOBLeague.ErrorCode.NO_MORE_TEAM_TO_CLAIM)] =
      "No more teams are available to claim";
    errorCodeDescription[uint8(BLOBLeague.ErrorCode.ALREADY_CLAIMED_A_TEAM)] =
      "You can only claim 1 team";
    errorCodeDescription[uint8(BLOBLeague.ErrorCode.NO_TEAM_OWNED)] =
      "You must own a team in the first place";
    errorCodeDescription[uint8(BLOBLeague.ErrorCode.INVALID_TEAM_ID)] =
      "Invalid team ID";
    errorCodeDescription[uint8(BLOBLeague.ErrorCode.INVALID_PLAYER_ID)] =
      "Invalid player ID";
    errorCodeDescription[uint8(BLOBLeague.ErrorCode.PLAYER_NOT_ON_THIS_TEAM)] =
      "This player does not belong to your team";
    errorCodeDescription[uint8(BLOBLeague.ErrorCode.PLAYER_ALREADY_ON_THIS_TEAM)] =
      "This player is already on this team";
    errorCodeDescription[uint8(BLOBLeague.ErrorCode.TEAM_EXCEED_MAX_PLAYER_COUNT)] =
      "Exceeded the maximum player limit of this team";
    errorCodeDescription[uint8(BLOBLeague.ErrorCode.LEAGUE_ADMIN_ONLY)] =
      "Only admin can call this";
    errorCodeDescription[uint8(BLOBLeague.ErrorCode.IN_DRAFT_ONLY)] =
      "Can only act in a draft";
    errorCodeDescription[uint8(BLOBLeague.ErrorCode.PRESEASON_ONLY)] =
      "Can only act on the preseason";
    errorCodeDescription[uint8(BLOBLeague.ErrorCode.TEAM_CONTRACT_ONLY)] =
      "Only Team Contract can call this";
    errorCodeDescription[uint8(BLOBLeague.ErrorCode.ALREADY_IN_DRAFT)] =
      "Draft has already started";
    errorCodeDescription[uint8(BLOBLeague.ErrorCode.DRAFT_INVALID_PICK_ORDER)] =
      "It is not your turn to pick player";
    errorCodeDescription[uint8(BLOBLeague.ErrorCode.PLAYER_NOT_ELIGIBLE_FOR_DRAFT)] =
      "Player is not eligible for draft";
    errorCodeDescription[uint8(BLOBLeague.ErrorCode.TEAM_TOO_MANY_ACTIVE_TRADE_TX)] =
      "This team has too many active trade transactions";
    errorCodeDescription[uint8(BLOBLeague.ErrorCode.TRADE_ACTIVE_TX_ONLY)] =
      "Can only act on active TradeTx";
    errorCodeDescription[uint8(BLOBLeague.ErrorCode.INVALID_TRADE_TX_ID)] =
      "Invalid TradeTx ID";
    errorCodeDescription[uint8(BLOBLeague.ErrorCode.PLAYER_NOT_ABLE_TO_CLAIM)] =
      "Cannot claim a player if it is not retired";
    errorCodeDescription[uint8(BLOBLeague.ErrorCode.INVALID_SEASON_STATE)] =
      "Act on an invalid Season state";
    errorCodeDescription[uint8(BLOBLeague.ErrorCode.SEASON_END_OF_MATCH_LIST)] =
      "Match index reached the end of the match list";
    errorCodeDescription[uint8(BLOBLeague.ErrorCode.SEASON_NOT_ENOUGH_TEAMS)] =
      "Must have at least 2 teams to schedule a season";
    errorCodeDescription[uint8(BLOBLeague.ErrorCode.LEAGUE_CONTRACT_ONLY)] =
      "Only league can call this";
    errorCodeDescription[uint8(BLOBLeague.ErrorCode.SEASON_CONTRACT_ONLY)] =
      "Only SeasonContract can call this";
    errorCodeDescription[uint8(BLOBLeague.ErrorCode.MATCH_CONTRACT_ONLY)] =
      "Only MatchContract can call this";
    errorCodeDescription[uint8(BLOBLeague.ErrorCode.TEAM_UNABLE_TO_ACQUIRE_UD_PLAYER)] =
      "Can only acquire undrafted player when playable roster falls under MIN_PLAYERS_ON_ROSTER";
    errorCodeDescription[uint8(BLOBLeague.ErrorCode.PLAYER_NAME_IMAGE_ALREADY_SET)] =
      "Can only set the name and image of a player once";
    errorCodeDescription[uint8(BLOBLeague.ErrorCode.SEASON_TEAM_COUNT_NOT_EVEN)] =
      "Team count should be even to start a season";
    errorCodeDescription[uint8(BLOBLeague.ErrorCode.MATCH_PLAYED_BEFORE_SCHEDULED_DATE)] =
      "Mactch should not be played before scheduled time";
    errorCodeDescription[uint8(BLOBLeague.ErrorCode.SEASON_MATCH_INTERVALS_INVALID)] =
      "Schedule intervals invalid";
  }
}
