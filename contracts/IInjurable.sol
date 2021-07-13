pragma solidity ^0.5.7;

interface Injurable {
    function CanPlay(uint _playerId, uint8 _roundId) view external returns(bool);
    function UpdateNextAvailableRound(uint _playerId,
                                      uint8 _roundId,
                                      uint8 _playTime,
                                      uint8 _performanceFactor) external;
}
