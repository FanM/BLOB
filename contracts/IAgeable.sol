pragma solidity ^0.5.7;

interface Ageable {
    function IsRetired(uint8 playerId) view external returns(bool);
    function IncrementAge(uint8 playerId) external;
}
