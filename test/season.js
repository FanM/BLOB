const BLOBRegistry = artifacts.require('BLOBRegistry');
const BLOBLeague = artifacts.require('BLOBLeague');
const BLOBSeason = artifacts.require('BLOBSeason');
const BLOBTeam = artifacts.require('BLOBTeam');
const BLOBPlayer = artifacts.require('BLOBPlayer');
const BLOBMatch = artifacts.require('BLOBMatch');
const BLOBUtils = artifacts.require('BLOBUtils');
const { parseErrorCode } = require('./error.js');

contract('BLOBSeason', async accounts => {
  "use strict";

  let registryContract = null;
  let leagueContract = null;
  let seasonContract = null;
  let teamContract = null;
  let playerContract = null;
  let matchContract = null;
  let utilsContract = null;

  before(async() => {
    registryContract = await BLOBRegistry.deployed();
    leagueContract = await BLOBLeague.deployed();
    teamContract = await BLOBTeam.deployed();
    playerContract = await BLOBPlayer.deployed();
    seasonContract = await BLOBSeason.deployed();
    matchContract = await BLOBMatch.deployed();
    utilsContract = await BLOBUtils.deployed();
    await registryContract.SetLeagueContract(leagueContract.address);
    await registryContract.SetSeasonContract(seasonContract.address);
    await registryContract.SetTeamContract(teamContract.address);
    await registryContract.SetPlayerContract(playerContract.address);
    await registryContract.SetMatchContract(matchContract.address);
  });

  it('Should initialize league with proper teams.', async() => {
    await leagueContract.Init();
    const teamCount = parseInt(await teamContract.teamCount());
    assert(teamCount === 0);
  });

  it('Should claim 2 teams with proper name and logoUrl.', async() => {
    await teamContract.ClaimTeam(
      "Lakers", "https://lalakers.com/logo.png",
      {from: accounts[1]}
    );
    let teamId = await teamContract.MyTeamId({from: accounts[1]});
    let newOwnerAddr = await teamContract.ownerOf(parseInt(teamId));
    assert(newOwnerAddr === accounts[1]);

    await teamContract.ClaimTeam(
      "Warriors", "https://sfwarriorrs.com/logo.png",
      {from: accounts[2]}
    );
    teamId = await teamContract.MyTeamId({from: accounts[2]});
    newOwnerAddr = await teamContract.ownerOf(parseInt(teamId));
    assert(newOwnerAddr === accounts[2]);
  });

  it('Should not claim a player if requirements are not met.', async() => {
    try {
      await teamContract.ClaimPlayer(0, {from: accounts[0]});
      assert(false);
    } catch(e) {
      const errorDesc = await parseErrorCode(e.message, utilsContract );
      assert(errorDesc === "You must own a team in the first place");
    }

    try {
      await teamContract.ClaimPlayer(0, {from: accounts[1]});
      assert(false);
    } catch(e) {
      const errorDesc = await parseErrorCode(e.message, utilsContract );
      assert(errorDesc === "Cannot claim a player if it is not retired");
    }

    try {
      await teamContract.ClaimPlayer(0, {from: accounts[2]});
      assert(false);
    } catch(e) {
      const errorDesc = await parseErrorCode(e.message, utilsContract );
      assert(errorDesc === "This player does not belong to this team");
    }
  });

  it('Should not be able to play a match in off season.', async() => {
    try {
      await leagueContract.PlayMatch({from: accounts[0]});
      assert(false);
    } catch(e) {
      const errorDesc = await parseErrorCode(e.message, utilsContract );
      assert(errorDesc === "Act on an invalid Season state");
    }
  });

  it('Should schedule games correctly for original teams.', async() => {
    await leagueContract.StartSeason();
    assert(parseInt(await seasonContract.seasonId()) === 0);
    assert(parseInt(await seasonContract.maxMatchRounds()) === 2);
    let lastMatch = await seasonContract.matchList(1);
    assert(lastMatch.matchRound.toNumber() === 1);
    assert(lastMatch.hostTeam.toNumber() === 1);
    assert(lastMatch.guestTeam.toNumber() === 0);
  });

  it('Should play a match successfully in active season and update match round.', async() => {
    assert((await seasonContract.matchRound()).toNumber() === 0);
    const balanceBefore = await web3.eth.getBalance(accounts[0]);
    await leagueContract.PlayMatch({from: accounts[0]});
    console.log("Gas cost for a game: ", web3.utils.fromWei(
      "" + (balanceBefore - (await web3.eth.getBalance(accounts[0]))), 'ether'));
    let firstMatch = await seasonContract.matchList(0);
    let hostTeam = firstMatch.hostTeam.toNumber();
    let hostScore = firstMatch.hostScore.toNumber();
    let guestScore = firstMatch.guestScore.toNumber();
    let gamesPlayed = await seasonContract.teamWins(hostTeam, 0);
    let wins = await seasonContract.teamWins(hostTeam, 1);
    let momentum = await seasonContract.teamMomentum(hostTeam);

    assert (parseInt(gamesPlayed) === 1);
    if (hostScore > guestScore) {
      assert (parseInt(wins) === 1);
      assert(parseInt(momentum) === 1);
    } else if (hostScore < guestScore) {
      assert(parseInt(wins) === 0);
      assert(parseInt(momentum) === -1);
    }

    assert((await seasonContract.matchRound()).toNumber() === 1);
    assert((await seasonContract.matchIndex()).toNumber() === 1);
  });

  it('Should update team players injuries after match', async() => {
    const playerIds = await teamContract.GetTeamRosterIds(0);
    let nextAvailableRound;
    for (let i=0; i<playerIds.length; i++) {
      const player = await playerContract.GetPlayer(playerIds[i]);
      nextAvailableRound = parseInt(player.nextAvailableRound);
      assert(nextAvailableRound >= parseInt(await seasonContract.matchRound()));
    }
  });

  it('Should not be able to start draft in active season.', async() => {
    try {
      await leagueContract.StartDraft();
      assert(false);
    } catch(e) {
      const errorDesc = await parseErrorCode(e.message, utilsContract );
      assert(errorDesc === "Can only act on the offseason");
    }
  });

  it('Should not be able to initiate a trade in active season.', async() => {
    try {
      await teamContract.ProposeTradeTx(1,
                                        [0],
                                        [15],
                                        {from: accounts[1]});
      assert(false);
    } catch(e) {
      const errorDesc = await parseErrorCode(e.message, utilsContract );
      assert(errorDesc === "Can only act on the offseason");
    }
  });

  it('Should play a consecutive match and end the season.', async() => {
    const player1inSeason = await playerContract.GetPlayer(1);
    //console.log("player1inSeason:", player1inSeason);
    const matchRound = parseInt(await seasonContract.matchRound());
    const matchIndex = parseInt(await seasonContract.matchIndex());
    // check forfeits due to player injuries
    const nextMatch = await seasonContract.matchList(matchIndex);
    const hostTeam = parseInt(nextMatch.hostTeam);
    const teamSalaryInSeason = await teamContract.teamTotalSalary(hostTeam);
    assert(teamSalaryInSeason.gt(0));

    const playerIds = await teamContract.GetTeamRosterIds(hostTeam);
    let hostForfeit = false;
    for (let i=0; i<playerIds.length; i++) {
      const player = await playerContract.GetPlayer(playerIds[i]);
      if (parseInt(player.nextAvailableRound) > matchRound)
        hostForfeit = true;
    }
    await leagueContract.PlayMatch({from: accounts[0]});
    const lastMatch = await seasonContract.matchList(matchIndex);
    assert(lastMatch.hostForfeit === hostForfeit);

    // the season ends
    assert(parseInt(await seasonContract.seasonId()) === 1);
    assert(parseInt(await seasonContract.seasonState()) === 2);
    const player1offSeason = await playerContract.GetPlayer(1);
    //console.log("player1offSeason:", player1offSeason);
    assert(parseInt(player1inSeason.age) + 1 === parseInt(player1offSeason.age))
    assert(parseInt(player1offSeason.nextAvailableRound) === 0)
    const teamSalaryOffSeason = await teamContract.teamTotalSalary(hostTeam);
    assert(teamSalaryOffSeason.gt(0));
  });

  it('Should be able to claim a player if it is retired.', async() => {
    const playerIds = await teamContract.GetTeamRosterIds(0);
    for (let i=0; i<playerIds.length; i++) {
      //console.log(playerIds[i] + ": " + await playerContract.IsRetired(playerIds[i]));
      if (await playerContract.IsRetired(playerIds[i])) {
        await teamContract.ClaimPlayer(playerIds[i], {from: accounts[1]});
        assert(await playerContract.ownerOf(playerIds[i]) === accounts[1]);
        try {
          await teamContract.ClaimPlayer(playerIds[i], {from: accounts[1]});
          assert(false);
        } catch(e) {
          const errorDesc = await parseErrorCode(e.message, utilsContract );
          assert(errorDesc === "This player does not belong to this team");
        }
      }
    }
  });

  it('Should schedule games correctly after adding one more team.', async() => {

    await teamContract.ClaimTeam(
      "Clippers", "https://laclippers.com/logo.png",
      {from: accounts[5]}
    );
    let teamId = await teamContract.MyTeamId({from: accounts[5]});
    let newOwnerAddr = await teamContract.ownerOf(parseInt(teamId));
    assert(newOwnerAddr === accounts[5]);

    await leagueContract.StartSeason();

    assert(parseInt(await seasonContract.seasonId()) === 1);
    assert(parseInt(await seasonContract.matchRound()) === 0);
    assert(parseInt(await seasonContract.matchIndex()) === 0);
    assert(parseInt(await seasonContract.maxMatchRounds()) === 6);
    const lastMatch = await seasonContract.matchList(5);
    assert(lastMatch.matchRound.toNumber() === 5);
    assert(lastMatch.hostTeam.toNumber() === 0);
    assert(lastMatch.guestTeam.toNumber() === 2);
  });

  it('Should play games til the end of the season.', async() => {
    let match;
    let matchIndex;
    const seasonId = parseInt(await seasonContract.seasonId());
    while(parseInt(await seasonContract.seasonState()) !== 2) {
        matchIndex = parseInt(await seasonContract.matchIndex());

        const balanceBefore = await web3.eth.getBalance(accounts[0]);
        await leagueContract.PlayMatch({from: accounts[0]});
        console.log("Gas cost for a game: ", web3.utils.fromWei(
          "" + (balanceBefore - (await web3.eth.getBalance(accounts[0]))), 'ether'));
        match = await seasonContract.matchList(matchIndex);
        assert(parseInt(match.hostScore) !== parseInt(match.guestScore));
        //console.log(match.matchId + "\t" + match.seasonId + "\t" + match.matchRound
        //                          + "\t" + match.hostTeam + "\t" + match.guestTeam
        //                          + "\t" + match.hostScore + "\t" + match.guestScore
        //                          + "\t" + match.hostForfeit + "\t" + match.guestForfeit);
    }
    const ranking = await seasonContract.GetTeamRanking();
    assert((await seasonContract.seasonToChampion(seasonId)).eq(ranking[0]));
    assert(parseInt(await seasonContract.seasonId()) === seasonId+1);
    //for (let i=0; i<ranking.length; i++) {
    //  console.log(`Team ${i}: ${ranking[i]}`);
    //}
  });
})
