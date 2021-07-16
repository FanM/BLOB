pragma solidity ^0.5.7;

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
   * @return uint
   */
  function randrange(int _a, int _b, uint _seed)
    internal view returns(int result, uint seed) {
      seed = rand(_seed);
      result = _a + int(seed % uint(_b - _a));
  }

  /**
   * @dev Generate random uint in range [a, b]
   * @return int
   */
  function randrange(int _a, int _b) internal view returns(int result, uint seed) {
      seed = rand(now);
      result = _a + int(seed % uint(_b - _a));
  }

  /**
   * @dev Generate array of random uint8 in range [a, b]
   * @param _size The size of the returned array
   * @param _seed The seed of psudo random generator
   * @return uint[_size]
   */
  function randuint8(uint8 _size, int8 _a, int8 _b, uint _seed)
    internal view returns (int8[] memory data, uint seed) {
      data = new int8[](_size);
      seed = _seed;
      int result;
      for(uint8 i; i<_size; i++){
          (result, seed) = randrange(_a, _b, seed);
          data[i] = int8(result);
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
    if (!checkValid(res)) revert("multiplyPct param overflow!");
    return uint8(res);
  }

  /**
   * @dev get a as a percentage of b
   * @return uint8
   */
  function dividePct(uint8 _a, uint8 _b) internal pure returns(uint8) {
    require(_b != 0, "Divide by zero");
    uint16 res = uint16(_a) * 100 / _b;
    if (!checkValid(res)) revert("dividePct param overflow!");
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
    int16 res = int16(_num) + _val;
    return checkValid(uint16(res))? uint8(res) : _num;
  }

  function checkValid(uint16 _data) internal pure returns(bool) {
    return _data >= 0 && _data < 256;
  }
}

contract LeagueControlled {
    address leagueContractAddr;

    constructor(address _leagueContractAddr) public {
        leagueContractAddr = _leagueContractAddr;
    }

    modifier leagueOnly() {
      require(
        leagueContractAddr == msg.sender,
        "Only league can call this.");
      _;
    }
}
