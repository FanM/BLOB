// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.6;

import './BLOBRegistry.sol';
import './BLOBPlayer.sol';
import './BLOBSeason.sol';
import './BLOBUtils.sol';

contract BLOBLeague is WithRegistry {

    struct TradeTx {
      uint id;
      TradeTxStatus status;
      uint8 initiatorTeam;
      uint8 counterpartyTeam;
      uint[] initiatorPlayers;
      uint[] counterpartyPlayers;
    }

    enum TradeTxStatus {
      ACTIVE,
      CANCELLED,
      REJECTED,
      ACCEPTED
    }

    event TradeTransaction(
      TradeTx tradeTx,
      uint timestamp
    );

    enum ErrorCode {
      OK,
      ALREADY_CLAIMED_A_TEAM,
      ALREADY_IN_DRAFT,
      DRAFT_INVALID_PICK_ORDER,
      IN_DRAFT_ONLY,
      INVALID_PLAYER_ID,
      INVALID_TEAM_ID,
      INVALID_TRADE_TX_ID,
      INVALID_SEASON_STATE,
      LEAGUE_ADMIN_ONLY,
      LEAGUE_CONTRACT_ONLY,
      MATCH_CONTRACT_ONLY,
      NO_MORE_TEAM_TO_CLAIM,
      NO_TEAM_OWNED,
      OFFSEASON_ONLY,
      PLAYER_ALREADY_ON_THIS_TEAM,
      PLAYER_EXCEED_SHOT_ALLOC,
      PLAYER_EXCEED_TIME_ALLOC,
      PLAYER_NAME_IMAGE_ALREADY_SET,
      PLAYER_NOT_ABLE_TO_CLAIM,
      PLAYER_NOT_ELIGIBLE_FOR_DRAFT,
      PLAYER_NOT_ON_THIS_TEAM,
      TEAM_CONTRACT_ONLY,
      TEAM_EXCEED_SALARY_CAP,
      TEAM_INSUFFICIENT_SHOT_ALLOC,
      TEAM_LESS_THAN_MIN_ROSTER,
      TEAM_MORE_THAN_MAX_ROSTER,
      TEAM_NOT_ENOUGH_STARTERS,
      TEAM_POS_TIME_ALLOC_INVALID,
      TEAM_REDUNDANT_STARTERS,
      TEAM_TOO_MANY_ACTVIE_TRADE_TX,
      TEAM_UNABLE_TO_ACQUIRE_UD_PLAYER,
      TRADE_ACTIVE_TX_ONLY,
      TRADE_INITIATED_BY_ME_ONLY,
      TRADE_PROPOSED_TO_ME_ONLY,
      SEASON_END_OF_MATCH_LIST,
      SEASON_CONTRACT_ONLY,
      SEASON_MATCH_ROUND_OUT_OF_ORDER,
      SEASON_NOT_ENOUGH_TEAMS
    }

    using Percentage for uint8;
    // the interval in seconds between each round of actions
    // the maximum of uint 16 is about 18 hours, normally should
    // be triggered within 8 hours.
    uint16 public constant ROUND_INTERVAL = 10;
    // the maximum active trade trasactons a team can place in
    // a trade window
    uint8 public constant TEAM_ACTIVE_TX_MAX = 10;

    address admin;
    bool initialized;

    uint public nextSchedulableTime;
    uint public tradeTxId;

    // the active player trade transaction list
    TradeTx[] public activeTradeTxList;

    // team active transaction count
    mapping (uint8 => uint8) public teamActiveTxCount;

    // other contracts
    BLOBPlayer PlayerContract;
    BLOBTeam TeamContract;
    BLOBSeason SeasonContract;
    BLOBMatch MatchContract;

    constructor(address _registryAddr)
        WithRegistry(_registryAddr) {
      admin = msg.sender;
    }

    modifier adminOnly() {
      require(msg.sender == admin,
        uint8(BLOBLeague.ErrorCode.LEAGUE_ADMIN_ONLY).toStr());
      _;
    }

    function Init() external adminOnly {
      if (!initialized) {
        PlayerContract = BLOBPlayer(RegistryContract.PlayerContract());
        TeamContract = BLOBTeam(RegistryContract.TeamContract());
        SeasonContract = BLOBSeason(RegistryContract.SeasonContract());
        MatchContract = BLOBMatch(RegistryContract.MatchContract());

        // initializes contracts
        SeasonContract.Init();
        TeamContract.Init();
        PlayerContract.Init();
        MatchContract.Init();
        initialized = true;
      }
    }

    function StartSeason() external adminOnly {
      // clear any trade transactions
      delete activeTradeTxList;
      for (uint8 teamId=0; teamId<TeamContract.teamCount(); teamId++) {
        teamActiveTxCount[teamId] = 0;
      }
      SeasonContract.StartSeason();
    }

    function PlayMatch() external adminOnly {
      SeasonContract.PlayMatch();
    }

    function EndDraft() external adminOnly {
      SeasonContract.EndDraft();
    }

    function GetActiveTradeTxList()
        external view returns (TradeTx[] memory) {
      return activeTradeTxList;
    }

    function ProposeTradeTx(uint8 _initiatorId,
                            uint8 _counterpartyId,
                            uint[] calldata _playersToSell,
                            uint[] calldata _playersToBuy)
        external teamOnly {
      require(
        teamActiveTxCount[_initiatorId] <= TEAM_ACTIVE_TX_MAX,
        uint8(BLOBLeague.ErrorCode.TEAM_TOO_MANY_ACTVIE_TRADE_TX).toStr()
      );
      activeTradeTxList.push(
        TradeTx({
          id: tradeTxId++,
          status: TradeTxStatus.ACTIVE,
          initiatorTeam: _initiatorId,
          counterpartyTeam: _counterpartyId,
          initiatorPlayers: _playersToSell,
          counterpartyPlayers: _playersToBuy
        })
      );
      teamActiveTxCount[_initiatorId]++;
    }

    function GetActiveTradeTx(uint _txId)
        external view returns (TradeTx memory) {
      uint index = getTradeTxIndex(_txId);
      return activeTradeTxList[index];
    }

    function CancelTradeTx(uint _txId) external teamOnly {
      finalizeTradeTx(_txId, TradeTxStatus.CANCELLED);
    }

    function RejectTradeTx(uint _txId) external teamOnly {
      finalizeTradeTx(_txId, TradeTxStatus.REJECTED);
    }

    function AcceptTradeTx(uint _txId) external teamOnly  {
      finalizeTradeTx(_txId, TradeTxStatus.ACCEPTED);
    }

    function finalizeTradeTx(uint _txId, TradeTxStatus _txStatus) private {
      uint index = getTradeTxIndex(_txId);
      activeTradeTxList[index].status = _txStatus;
      teamActiveTxCount[activeTradeTxList[index].initiatorTeam]--;
      emit TradeTransaction(activeTradeTxList[index], block.timestamp);
      removeTradeTx(index);
    }

    function getTradeTxIndex(uint _txId)
        private view returns (uint) {
      for (uint i=0; i<activeTradeTxList.length; i++) {
        if (activeTradeTxList[i].id == _txId)
          return i;
      }
      revert(uint8(BLOBLeague.ErrorCode.TRADE_ACTIVE_TX_ONLY).toStr());
    }

    function removeTradeTx(uint _index) private {
      assert(_index < activeTradeTxList.length);
      activeTradeTxList[_index] = activeTradeTxList[activeTradeTxList.length-1];
      activeTradeTxList.pop();
    }
}
