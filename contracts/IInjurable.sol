pragma solidity ^0.5.7;

interface Injurable {
    function CanPlay(uint8 playerId, uint8 roundId) view external returns(bool);
    function UpdateAfterMatch(uint8 playerId, uint roundId, uint256 playTime) external;
}