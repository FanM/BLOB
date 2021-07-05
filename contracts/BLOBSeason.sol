pragma solidity ^0.5.7;
import './BLOBLeague.sol';
import './BLOBPlayer.sol';
import './BLOBTeam.sol';

contract BLOBSeason {

    event Match (
        uint matchId,
        uint8 hostTeam,
        uint8 guestTeam,
        uint8 hostScore,
        uint8 guestScore);

    event PlayerStats (
        uint8 matchId,
        uint8 playerId,
        uint8 playMinutes,
        uint8 points,
        uint8 shotPct,
        uint8 shot3PointPct,
        uint8 freeThrowPct,
        uint8 assists,
        uint8 rebounds,
        uint8 blockages,
        uint8 steals);

    enum SeasonState {
      Active,
      Break,
      Offseason
    }

    // constants
    uint8 public constant MaxMatchRounds = 82;

    // season id
    uint public seasonId;

    // match id
    uint private matchId;

    // match round
    uint8 public matchRound;

    // match list
    uint8[MaxMatchRounds][] matchList;

    // the number of wins each team has, used to track team ranking
    mapping(uint8=>uint8) teamWins;

    // other contracts
    BLOBLeague LeagueContract;
    BLOBPlayer PlayerContract;
    BLOBTeam TeamContract;

    constructor(BLOBPlayer _blobPlayer, BLOBTeam _blobTeam, address _leagueContractAddr) public {
      LeagueContract = BLOBLeague(_leagueContractAddr);
      PlayerContract = _blobPlayer;
      TeamContract = _blobTeam;
    }

    // league only
    function NextAction() external {
    }

    function playCurrentRound() private {
      // for each match in matchList[matchRound]
      //    playMatchAndUpdateResult
      // matchRound++;
    }

    function startSeason() private {
      // 1. generate match list
      // 2.
    }

    function endSeason() private {
      // 1. finalize season stats
      // 2. update player salaries
      // 3. increment player age
    }

    function playMatchAndUpdateResult(uint8 hostId, uint guessId) private {

    }


}
