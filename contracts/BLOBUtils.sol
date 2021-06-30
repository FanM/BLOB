pragma solidity ^0.5.7;

library Random {
  /**
   * @dev Generate random uint <= 256^2
   * @param seed
   * @return uint
   */
  function rand(uint seed) internal pure returns (uint) {
      bytes32 data;
      if (seed % 2 == 0){
          data = keccak256(abi.encode(seed));
      } else {
          data = keccak256(abi.encode(keccak256(abi.encode(seed))));
      }
      uint sum;
      for(uint i;i < 32;i++){
          sum += uint8(data[i]);
      }
      return uint8(data[sum % data.length]) * uint8(data[(sum + 2) % data.length]);
  }

  /**
   * @dev Generate random uint in range [a, b] with seed
   * @return uint
   */
  function randrange(uint a, uint b, uint seed) internal pure returns(uint) {
      return a + (rand(seed) % b);
  }

  /**
   * @dev Generate random uint in range [a, b]
   * @return uint
   */
  function randrange(uint a, uint b) internal view returns(uint) {
      return a + (rand(now) % b);
  }

  /**
   * @dev Generate array of random uint8 in range [a, b]
   * @param size seed
   * @return uint8[size]
   */
  function randuint8(uint8 size, uint8 a, uint8 b, uint seed) internal pure returns (uint8[] memory) {
      uint8 [] memory data = new uint8[](size);
      uint x = seed;
      for(uint8 i;i < size;i++){
          x = randrange(a, b, x);
          data[i] = uint8(x % 256);
      }
      return data;
  }
}

library Percentage {

  /**
   * @dev get the percentage of num
   * @param num pct
   * @return uint8
   */
  function multiplyPct(uint8 num, uint8 pct) internal pure returns(uint8) {
    return uint8(num * pct / 100);
  }

  /**
   * @dev get a as a percentage of b
   * @param a b
   * @return uint8
   */
  function dividePct(uint8 a, uint8 b) internal pure returns(uint8) {
    return uint8(a * 100 / b);
  }

}
