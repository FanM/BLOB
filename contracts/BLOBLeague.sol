// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.6;

import './BLOBRegistry.sol';
import './BLOBPlayer.sol';
import './BLOBTeam.sol';
import './BLOBSeason.sol';

contract BLOBLeague is WithRegistry {
    uint8 public constant MAX_TEAMS = 10;
    // the interval in seconds between each round of actions
    // the maximum of uint 16 is about 18 hours, normally should
    // be triggered within 8 hours.
    uint16 public constant RoundInterval = 10;

    address admin;
    bool initialized;

    uint public nextSchedulableTime;
    uint public draftStartTime;

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

    // other contracts
    BLOBPlayer PlayerContract;
    BLOBTeam TeamContract;
    BLOBSeason SeasonContract;

    constructor(address _registryAddr)
        WithRegistry(_registryAddr) {
      admin = msg.sender;
    }

    modifier adminOnly() {
      require(msg.sender == admin,
              "Only admin can call this");
      _;
    }

    modifier inDraft() {
      require(
        draftStartTime > 0,
        "Not in a draft."
      );
      _;
    }

    function Init() external adminOnly {
      if (!initialized) {
        PlayerContract = BLOBPlayer(RegistryContract.PlayerContract());
        TeamContract = BLOBTeam(RegistryContract.TeamContract());
        SeasonContract = BLOBSeason(RegistryContract.SeasonContract());

        // initializes contracts
        SeasonContract.Init();
        TeamContract.Init();
        PlayerContract.Init();
        initialized = true;
      }
    }

    function ClaimTeam(string calldata _name, string calldata _logoUrl)
        external {
      require(TeamContract.balanceOf(msg.sender) == 0,
              "You can only claim 1 team.");
      require(SeasonContract.seasonState() == BLOBSeason.SeasonState.Offseason,
              "You can only claim team in the offseason.");

      uint8 teamId = TeamContract.CreateTeam(msg.sender);
      uint[] memory newPlayerIds = PlayerContract.MintPlayersForTeam();
      TeamContract.InitTeam(teamId, _name, _logoUrl, newPlayerIds);
    }

    function StartSeason() external adminOnly {
      SeasonContract.StartSeason();
    }

    function PlayMatch() external adminOnly {
      SeasonContract.PlayMatch();
    }

    function StartDraft() external adminOnly {
      require(SeasonContract.seasonState() == BLOBSeason.SeasonState.Offseason,
              "Draft can be started only in the offseason.");
      require(
        draftStartTime == 0,
        "Draft has already started."
      );
      // for each position, we create one player for each team to pick up
      uint8 teamCount = TeamContract.GetTeamCount();
      for (uint8 i=0; i<5; i++) {
        uint[] memory newPlayerIds = PlayerContract.MintPlayersForDraft(
                                            BLOBPlayer.Position(i), teamCount);
        for (uint8 j=0; j<newPlayerIds.length; j++)
          draftPlayerIds.push(newPlayerIds[j]);
      }
      teamRanking = SeasonContract.GetTeamRanking();
      require(
        teamRanking.length == teamCount,
        "Unexpected! Team ranking is invalid."
      );
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
        external inDraft {
      require(
        RegistryContract.TeamContract() == msg.sender,
        "Only Team Contract can call this."
      );
      // checks if it's already passed the current draft round time limit,
      // as we need to advance the draft round even if some teams give up
      // their picks
      if (block.timestamp > draftStartTime + draftRound * teamRanking.length * 10 minutes){
        pickOrderStart = uint8(teamRanking.length) - 1;
        draftRound++;
      }

      for(uint i=0; i<draftPlayerIds.length; i++) {
        if (_playerId == draftPlayerIds[i]) {
          uint order = getPickOrder(_teamId);
          // each team has 10 minutes in deciding which player they want to pick
          require(
            block.timestamp >= draftStartTime + draftRound * order * 10 minutes
            && block.timestamp < draftStartTime + draftRound * (order + 1) * 10 minutes,
            "It is not your turn to pick player."
          );
          // removes playerId from draft player list
          draftPlayerIds[i] = draftPlayerIds[draftPlayerIds.length-1];
          draftPlayerIds.pop();
          // advances the pickOrderStart to avoid the same team picks again
          // in the same time slot
          pickOrderStart--;
          return;
        }
      }
      revert("Player is not eligible for draft.");
    }

    function getPickOrder(uint8 _teamId) private view returns(uint8) {
      for (uint8 i=pickOrderStart; i>=0; i--) {
        if (_teamId == teamRanking[i])
          // lower ranking team gets higher pick order
          return uint8(teamRanking.length) - i - 1;
        if (i == 0) // takes care of uint underflow
          break;
      }
      revert("Team id is either invalid or already took the pick in this round.");
    }

    // only in trade window can exchange players
    function openTradeWindow() private {

    }
}
