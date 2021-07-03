pragma solidity ^0.5.7;

interface Ageable {
    function IsRetired(uint _playerId) view external returns(bool);
    function IncrementAge(uint _playerId) external;
}
