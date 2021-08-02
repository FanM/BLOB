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

    event DraftPick(
      uint seasonId,
      uint playerId,
      uint8 draftRound,
      uint8 draftPick,
      uint8 teamId
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
    uint public draftStartTime;
    uint public tradeTxId;

    // draft pool
    // only active in the pre-season, once season starts,
    // unpicked players go to the undrafted pool.
    uint[] public draftPlayerIds;

    // undrafted players, can be picked up through the season
    uint[] public undraftedPlayerIds;

    // the ranking of teams in the previous season
    uint8[] public teamRanking;

    // the current starting place to check order for each draft round
    uint8 public pickOrderStart;

    // the draft round
    uint8 public draftRound;

    // the player trade transaction list
    TradeTx[] public tradeTxList;

    // team active transaction count
    mapping (uint8 => uint8) teamActiveTxCount;

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

    modifier inDraft() {
      require(
        draftStartTime > 0,
        uint8(BLOBLeague.ErrorCode.IN_DRAFT_ONLY).toStr()
      );
      _;
    }

    modifier offseasonOnly() {
      require(
        SeasonContract.seasonState() == BLOBSeason.SeasonState.Offseason,
        uint8(BLOBLeague.ErrorCode.OFFSEASON_ONLY).toStr()
      );
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
      delete tradeTxList;
      SeasonContract.StartSeason();
    }

    function PlayMatch() external adminOnly {
      SeasonContract.PlayMatch();
    }

    function StartDraft() external adminOnly offseasonOnly {
      require(
        draftStartTime == 0,
        uint8(BLOBLeague.ErrorCode.ALREADY_IN_DRAFT).toStr()
      );
      // for each position, we create one player for each team to pick up
      uint8 teamCount = TeamContract.teamCount();
      for (uint8 i=0; i<5; i++) {
        uint[] memory newPlayerIds = PlayerContract.MintPlayersForDraft(
                                            BLOBPlayer.Position(i), teamCount);
        for (uint8 j=0; j<newPlayerIds.length; j++)
          draftPlayerIds.push(newPlayerIds[j]);
      }
      teamRanking = SeasonContract.GetTeamRanking();
      assert(teamRanking.length == teamCount);
      draftStartTime = block.timestamp;
      draftRound = 1;
      pickOrderStart = uint8(teamRanking.length) - 1;
    }

    function EndDraft() external adminOnly inDraft {
      for (uint i=0; i<draftPlayerIds.length; i++) {
        undraftedPlayerIds.push(draftPlayerIds[i]);
      }
      delete draftPlayerIds;
      delete teamRanking;
      draftStartTime = 0;
    }

    function GetDraftPlayerList()
        external view inDraft returns(uint[] memory) {
      return draftPlayerIds;
    }

    function GetUndraftedPlayerList()
        external view returns(uint[] memory) {
      return undraftedPlayerIds;
    }

    function CheckAndPickDraftPlayer(uint _playerId, uint8 _teamId)
        external inDraft teamOnly {
      // checks if it's already passed the current draft round time limit,
      // as we need to advance the draft round even if some teams give up
      // their picks
      if (block.timestamp > draftStartTime + draftRound * teamRanking.length * 10 minutes){
        pickOrderStart = uint8(teamRanking.length) - 1;
        draftRound++;
      }

      uint8 playerCount = TeamContract.teamCount() * 5;
      for(uint i=0; i<draftPlayerIds.length; i++) {
        if (_playerId == draftPlayerIds[i]) {
          uint8 order = getPickOrder(_teamId);
          // each team has 10 minutes in deciding which player they want to pick
          require(
            block.timestamp >= draftStartTime + draftRound * order * 10 minutes
            && block.timestamp < draftStartTime + draftRound * (order + 1) * 10 minutes,
            uint8(BLOBLeague.ErrorCode.DRAFT_INVALID_PICK_ORDER).toStr()
          );
          // removes playerId from draft player list
          draftPlayerIds[i] = draftPlayerIds[draftPlayerIds.length-1];
          draftPlayerIds.pop();
          emit DraftPick(
            SeasonContract.seasonId(),
            _playerId,
            draftRound,
            playerCount - uint8(draftPlayerIds.length),
            _teamId);
          // advances the pickOrderStart to avoid the same team picks again
          // in the same time slot
          pickOrderStart--;
          return;
        }
      }
      revert(uint8(BLOBLeague.ErrorCode.PLAYER_NOT_ELIGIBLE_FOR_DRAFT).toStr());
    }

    function PickUndraftPlayer(uint _playerId)
        external teamOnly {
      for(uint i=0; i<undraftedPlayerIds.length; i++) {
        if (_playerId == undraftedPlayerIds[i]) {
          undraftedPlayerIds[i] = undraftedPlayerIds[undraftedPlayerIds.length-1];
          undraftedPlayerIds.pop();
          return;
        }
      }
      revert(uint8(BLOBLeague.ErrorCode.INVALID_PLAYER_ID).toStr());
    }

    function GetTradeTxList()
        external view returns (TradeTx[] memory) {
      return tradeTxList;
    }

    function ProposeTradeTx(uint8 _initiatorId,
                            uint8 _counterpartyId,
                            uint[] calldata _playersToSell,
                            uint[] calldata _playersToBuy)
        external teamOnly offseasonOnly {
      require(
        teamActiveTxCount[_initiatorId] <= TEAM_ACTIVE_TX_MAX,
        uint8(BLOBLeague.ErrorCode.TEAM_TOO_MANY_ACTVIE_TRADE_TX).toStr()
      );
      tradeTxList.push(
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

    function GetTradeTx(uint _txId)
        external view returns (TradeTx memory) {
      uint index = getTradeTxIndex(_txId);
      return tradeTxList[index];
    }

    function CancelTradeTx(uint _txId) external teamOnly {
      uint index = checkActiveTx(_txId);
      tradeTxList[index].status = TradeTxStatus.CANCELLED;
      teamActiveTxCount[tradeTxList[index].initiatorTeam]--;
      emit TradeTransaction(tradeTxList[index], block.timestamp);
    }

    function RejectTradeTx(uint _txId) external teamOnly {
      uint index = checkActiveTx(_txId);
      tradeTxList[index].status = TradeTxStatus.REJECTED;
      teamActiveTxCount[tradeTxList[index].initiatorTeam]--;
      emit TradeTransaction(tradeTxList[index], block.timestamp);
    }

    function AcceptTradeTx(uint _txId)
        external teamOnly returns (TradeTx memory acceptedTx) {
      uint index = checkActiveTx(_txId);
      tradeTxList[index].status = TradeTxStatus.ACCEPTED;
      acceptedTx = tradeTxList[index];
      teamActiveTxCount[acceptedTx.initiatorTeam]--;
      emit TradeTransaction(acceptedTx, block.timestamp);
    }

    function checkActiveTx(uint _txId)
        private view returns (uint index) {
      index = getTradeTxIndex(_txId);
      require(
        tradeTxList[index].status == TradeTxStatus.ACTIVE,
        uint8(BLOBLeague.ErrorCode.TRADE_ACTIVE_TX_ONLY).toStr()
      );
    }

    function getTradeTxIndex(uint _txId)
        private view returns (uint) {
      for (uint i=0; i<tradeTxList.length; i++) {
        if (tradeTxList[i].id == _txId)
          return i;
      }
      revert(uint8(BLOBLeague.ErrorCode.INVALID_TRADE_TX_ID).toStr());
    }

    function getPickOrder(uint8 _teamId)
        private view returns(uint8) {
      for (uint8 i=pickOrderStart; i>=0; i--) {
        if (_teamId == teamRanking[i])
          // lower ranking team gets higher pick order
          return uint8(teamRanking.length) - i - 1;
        if (i == 0) // takes care of uint underflow
          break;
      }
      revert(uint8(BLOBLeague.ErrorCode.DRAFT_INVALID_PICK_ORDER).toStr());
    }
}
