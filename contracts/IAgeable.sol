// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.6;

interface Ageable {
    function IsRetired(uint _playerId) view external returns(bool);
    function UpdatePlayerPhysicalCondition(uint _seed) external;
}
