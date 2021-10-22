// SPDX-License-Identifier: MIT

pragma solidity ^0.8.6;

import '@openzeppelin/contracts/token/ERC721/ERC721.sol';
import '@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol';
import './BLOBLeague.sol';
import './BLOBPlayer.sol';
import './BLOBMatch.sol';
import './BLOBRegistry.sol';
import './BLOBUtils.sol';

contract BLOBTeam is ERC721, ERC721Holder, WithRegistry {

    struct Team {
        uint8 id;
        string name;
        string logoUrl;
    }

    event TeamMinted(
      uint8 teamId,
      uint seasonId,
      string name,
      string logoUrl,
      address owner
    );

    event TeamTransferred(
      uint8 teamId,
      address owner
    );

    event PlayerTeamChanged(
      uint playerId,
      uint8 currentTeam
    );

    using Percentage for uint8;

    // team id
    uint8 public teamCount;

    // constants
    uint8 constant public MAX_TEAMS = 30;
    uint16 constant public MAX_TEAM_PLAYER_COUNT = 16;
    uint8 constant public DEFAULT_3POINT_SHOT_PCT = 30;

    mapping(uint8 => Team) private idToTeam;
    mapping(address => uint8) private ownerToTeamId;
    mapping(uint8 => uint[]) private idToPlayers; // team players
    mapping(uint => uint8) public shot3PAllocation; // team 3 point shot allocation

    // other contracts
    BLOBLeague LeagueContract;
    BLOBMatch MatchContract;
    BLOBPlayer PlayerContract;
    BLOBSeason SeasonContract;

    constructor(
        string memory _name,
        string memory _symbol,
        address _registryContractAddr)
        ERC721(_name, _symbol)
        WithRegistry(_registryContractAddr) {}

    modifier initiatedByMe(uint _txId) {
      uint8 myTeamId = MyTeamId();
      BLOBLeague.TradeTx memory tradeTx = LeagueContract.GetActiveTradeTx(_txId);
      require(
        tradeTx.initiatorTeam == myTeamId,
        uint8(BLOBLeague.ErrorCode.TRADE_INITIATED_BY_ME_ONLY).toStr()
      );
      _;
    }

    modifier proposedToMe(uint _txId) {
      uint8 myTeamId = MyTeamId();
      BLOBLeague.TradeTx memory tradeTx = LeagueContract.GetActiveTradeTx(_txId);
      require(
        tradeTx.counterpartyTeam == myTeamId,
        uint8(BLOBLeague.ErrorCode.TRADE_PROPOSED_TO_ME_ONLY).toStr()
      );
      _;
    }

    function _transfer(address _from, address _to, uint _tokenId)
        internal override {
      require(balanceOf(_to) == 0,
        uint8(BLOBLeague.ErrorCode.ALREADY_CLAIMED_A_TEAM).toStr());
      ERC721._transfer(_from, _to, _tokenId);
      uint8 teamId = uint8(_tokenId);
      ownerToTeamId[_to] = teamId;
      emit TeamTransferred(teamId, _to);
    }

    function Init() external leagueOnly {
      LeagueContract = BLOBLeague(RegistryContract.LeagueContract());
      MatchContract = BLOBMatch(RegistryContract.MatchContract());
      PlayerContract = BLOBPlayer(RegistryContract.PlayerContract());
      SeasonContract = BLOBSeason(RegistryContract.SeasonContract());
    }

    function ClaimTeam(string calldata _name, string calldata _logoUrl)
        external {
      require(teamCount < MAX_TEAMS,
        uint8(BLOBLeague.ErrorCode.NO_MORE_TEAM_TO_CLAIM).toStr());
      require(balanceOf(msg.sender) == 0,
        uint8(BLOBLeague.ErrorCode.ALREADY_CLAIMED_A_TEAM).toStr());
      require(SeasonContract.seasonState() == BLOBSeason.SeasonState.PRESEASON,
        uint8(BLOBLeague.ErrorCode.PRESEASON_ONLY).toStr());

      //uint8 teamId = TeamContract.CreateTeam(msg.sender);
      Team memory newTeam;
      newTeam.id = teamCount;

      _safeMint(msg.sender, teamCount);
      idToTeam[teamCount] = newTeam;
      ownerToTeamId[msg.sender] = teamCount++;
      uint seasonId = SeasonContract.seasonId();
      emit TeamMinted(newTeam.id, seasonId, _name, _logoUrl, msg.sender);

      // initialize each team with 12 players, 2 per each position, 2 additional
      uint[] memory newPlayerIds = PlayerContract.MintPlayersForTeam(
        seasonId, 2, 2);
      initTeam(newTeam.id, _name, _logoUrl, newPlayerIds);
    }

    function initTeam(uint8 _teamId,
                      string memory _name,
                      string memory _logoUrl,
                      uint[] memory _playerIds) private {
      Team storage team = idToTeam[_teamId];
      team.name = _name;
      team.logoUrl = _logoUrl;
      shot3PAllocation[_teamId] = DEFAULT_3POINT_SHOT_PCT;

      // initialize players of each position with equal play time
      for (uint8 i=0; i<MatchContract.MAX_PLAYERS_ON_ROSTER(); i++) {
        uint playerId = _playerIds[i];
        addPlayer(_teamId, playerId);
        // for simplicity, gives the first player in each position starter role
        // 3 quarters game time, and 15% shots, the second player 5% shots,
        // 1 quarter game time and 0 minute for the rest of players
        if (i < 5 * 2) {
          uint8 halfPlayTime = MatchContract.MINUTES_IN_MATCH() / 2;
          if (i % 2 == 0) {
            PlayerContract.SetPlayerGameTime(
              BLOBPlayer.GameTime({
                playerId: playerId,
                playTime: halfPlayTime ,
                shotAllocation: 10,
                shot3PAllocation: 10,
                starter: true
              }
            ));
          } else if (i % 2 == 1) {
            PlayerContract.SetPlayerGameTime(
              BLOBPlayer.GameTime({
                playerId: playerId,
                playTime: halfPlayTime ,
                shotAllocation: 10,
                shot3PAllocation: 10,
                starter: false
              }
            ));
          }
        }
      }
    }

    function MyTeamId()
        view public returns(uint8) {
      require(
        balanceOf(msg.sender) == 1,
        uint8(BLOBLeague.ErrorCode.NO_TEAM_OWNED).toStr());
      return idToTeam[ownerToTeamId[msg.sender]].id;
    }

    function GetTeam(uint8 _teamId) view external
        returns(Team memory team) {
      team = idToTeam[_teamId];
      require(
        team.id == _teamId,
        uint8(BLOBLeague.ErrorCode.INVALID_TEAM_ID).toStr()
      );
    }

    function GetTeams() view external
        returns(Team[] memory teams) {
      teams = new Team[](teamCount);
      for (uint8 i=0; i<teamCount; i++) {
        teams[i] = idToTeam[i];
      }
    }

    function GetTeamRosterIds(uint8 _teamId)
        view external returns(uint[] memory) {
      require(
        _teamId < teamCount,
        uint8(BLOBLeague.ErrorCode.INVALID_TEAM_ID).toStr()
      );
      return idToPlayers[_teamId];
    }

    function tokenURI(uint256 tokenId)
        public view override returns(string memory) {
      require(
        _exists(tokenId),
        uint8(BLOBLeague.ErrorCode.INVALID_TEAM_ID).toStr()
      );
      return idToTeam[uint8(tokenId)].logoUrl;
    }

    function SetTeamShot3PAllocation(uint8 _shot3PAllocation) external {
      uint8 teamId = MyTeamId();
      shot3PAllocation[teamId] = _shot3PAllocation;
    }

    function SetPlayersGameTime(BLOBPlayer.GameTime[] calldata _gameTimes)
        external {
      uint8 teamId = MyTeamId();
      for (uint8 i=0; i<_gameTimes.length; i++) {
        BLOBPlayer.GameTime memory gameTime = _gameTimes[i];
        // checks if the player does belong to this team
        require(
          teamPlayerExists(teamId, _gameTimes[i].playerId),
          uint8(BLOBLeague.ErrorCode.PLAYER_NOT_ON_THIS_TEAM).toStr()
        );
        PlayerContract.SetPlayerGameTime(gameTime);
      }
    }

    function SetPlayerNameAndImage(uint _playerId,
                                   string memory _name,
                                   string memory _imageUrl)
        external {
      uint8 teamId = MyTeamId();
      require(
        teamPlayerExists(teamId, _playerId),
        uint8(BLOBLeague.ErrorCode.PLAYER_NOT_ON_THIS_TEAM).toStr()
      );
      PlayerContract.SetPlayerNameAndImage(_playerId, _name, _imageUrl);
    }

    // when a player is retired, its team owner can claim its ownership
    function ClaimPlayer(uint _playerId) external {
      uint8 myTeamId = MyTeamId();
      // checks if this player belongs to my team
      require(
        teamPlayerExists(myTeamId, _playerId),
        uint8(BLOBLeague.ErrorCode.PLAYER_NOT_ON_THIS_TEAM).toStr()
      );
      PlayerContract.TransferPlayer(_playerId, msg.sender);
      removePlayer(myTeamId, _playerId);
    }

    function DraftPlayer(uint _playerId) external {
      uint8 teamId = MyTeamId();
      SeasonContract.CheckAndPickDraftPlayer(_playerId, teamId);
      addPlayer(teamId, _playerId);
    }

    // can acquire players when the playable roster falls
    // under MIN_PLAYERS_ON_ROSTER
    function AcquireUndraftedPlayer(uint _playerId) external {
      uint8 teamId = MyTeamId();
      BLOBLeague.ErrorCode errCode =
        MatchContract.ValidateTeamPlayerGameTime(teamId);
      require(
        errCode == BLOBLeague.ErrorCode.TEAM_LESS_THAN_MIN_ROSTER,
        uint8(BLOBLeague.ErrorCode.TEAM_UNABLE_TO_ACQUIRE_UD_PLAYER).toStr()
      );
      SeasonContract.PickUndraftPlayer(_playerId);
      addPlayer(teamId, _playerId);
    }

    function TeamPlayersExist(uint8 _teamId, uint[] memory _playerIds)
        public view returns(bool) {
      if (_playerIds.length == 0)
        return false;
      for (uint8 i=0; i<_playerIds.length; i++) {
        if (!teamPlayerExists(_teamId, _playerIds[i]))
          return false;
      }
      return true;
    }

    function ProposeTradeTx(uint8 _otherTeamId,
                            uint[] calldata _playersToSell,
                            uint[] calldata _playersToBuy) external {
      uint8 myTeamId = MyTeamId();
      // verify _playersToSell are indeed my team players
      require(
        TeamPlayersExist(myTeamId, _playersToSell),
        uint8(BLOBLeague.ErrorCode.PLAYER_NOT_ON_THIS_TEAM).toStr()
      );
      // verify _playersToBuy are from the other team
      require(
        TeamPlayersExist(_otherTeamId, _playersToBuy),
        uint8(BLOBLeague.ErrorCode.PLAYER_NOT_ON_THIS_TEAM).toStr()
      );
      LeagueContract.ProposeTradeTx(myTeamId,
                                    _otherTeamId,
                                    _playersToSell,
                                    _playersToBuy);
    }

    function CancelTradeTx(uint _txId) external initiatedByMe(_txId) {
      LeagueContract.CancelTradeTx(_txId);
    }

    function RejectTradeTx(uint _txId) external proposedToMe(_txId) {
      LeagueContract.RejectTradeTx(_txId);
    }

    function AcceptTradeTx(uint _txId) external proposedToMe(_txId) {
      BLOBLeague.TradeTx memory acceptedTx = LeagueContract.GetActiveTradeTx(_txId);
      LeagueContract.AcceptTradeTx(_txId);
      // Since we don't know if those players from the initiator team or
      // counterparty team are still available as they may have been traded in
      // other transactions, we can only rely on the check on remve/add players.
      for (uint8 i=0; i<acceptedTx.initiatorPlayers.length; i++) {
        // need to remove players from both team before adding players,
        // otherwise we may hit the player cap
        removePlayer(acceptedTx.initiatorTeam, acceptedTx.initiatorPlayers[i]);
      }
      for (uint8 i=0; i<acceptedTx.counterpartyPlayers.length; i++) {
        removePlayer(acceptedTx.counterpartyTeam, acceptedTx.counterpartyPlayers[i]);
        addPlayer(acceptedTx.initiatorTeam, acceptedTx.counterpartyPlayers[i]);
      }
      for (uint8 i=0; i<acceptedTx.initiatorPlayers.length; i++) {
        addPlayer(acceptedTx.counterpartyTeam, acceptedTx.initiatorPlayers[i]);
      }
    }

    function addPlayer(uint8 _teamId,
                       uint _playerId)
        private {
      require(
        MAX_TEAM_PLAYER_COUNT  >
        idToPlayers[_teamId].length,
        uint8(BLOBLeague.ErrorCode.TEAM_EXCEED_MAX_PLAYER_COUNT).toStr()
      );
      require(
        !teamPlayerExists(_teamId, _playerId),
        uint8(BLOBLeague.ErrorCode.PLAYER_ALREADY_ON_THIS_TEAM).toStr()
      );
      idToPlayers[_teamId].push(_playerId);
      // reset player game time
      PlayerContract.SetPlayerGameTime(
        BLOBPlayer.GameTime({
          playerId: _playerId,
          playTime: 0,
          shotAllocation: 0,
          shot3PAllocation: 0,
          starter: false
        }
      ));
      emit PlayerTeamChanged(_playerId, _teamId);
    }

    function removePlayer(uint8 _teamId,
                          uint _playerId)
        private {
      uint[] memory teamPlayerIds = idToPlayers[_teamId];
      uint8 index = uint8(teamPlayerIds.length);
      for (uint8 i=0; i<teamPlayerIds.length; i++) {
        if (_playerId == teamPlayerIds[i]) {
          index = i;
          break;
        }
      }
      if (index != teamPlayerIds.length) {
        // found the player
        idToPlayers[_teamId][index] = teamPlayerIds[teamPlayerIds.length-1];
        idToPlayers[_teamId].pop();
      } else {
        revert(uint8(BLOBLeague.ErrorCode.PLAYER_NOT_ON_THIS_TEAM).toStr());
      }
    }

    function teamPlayerExists(uint8 _teamId, uint _playerId)
        private view returns(bool) {
      uint[] memory teamPlayerIds = idToPlayers[_teamId];
      for (uint8 i=0; i<teamPlayerIds.length; i++) {
        if (_playerId == teamPlayerIds[i]) {
          return true;
        }
      }
      return false;
    }
}
