// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.6;

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
    uint8 tmpIndex;
    for (uint8 i=0; i<_arr.length; i++) {
      (index, curMax) = (i, _arr[i]);
      for (uint8 j=i+1; j<_arr.length; j++) {
        if (_arr[j] > curMax) {
          (index, curMax) = (j, _arr[j]);
        }
      }
      _arr[index] = _arr[i];
      _arr[i] = curMax;
      tmpIndex = ranks[i];
      ranks[i] = ranks[index];
      ranks[index] = tmpIndex ;
    }
  }
}
