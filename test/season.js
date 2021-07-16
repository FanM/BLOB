const BLOBRegistry = artifacts.require('BLOBRegistry');
const BLOBLeague = artifacts.require('BLOBLeague');
const BLOBSeason = artifacts.require('BLOBSeason');
const BLOBTeam = artifacts.require('BLOBTeam');
const BLOBPlayer = artifacts.require('BLOBPlayer');

contract('BLOBSeason', async accounts => {
  "use strict";

  let registryContract = null;
  let leagueContract = null;
  let seasonContract = null;
  let teamContract = null;
  let playerContract = null;

  before(async() => {
    registryContract = await BLOBRegistry.deployed();
    leagueContract = await BLOBLeague.deployed();
    teamContract = await BLOBTeam.deployed();
    playerContract = await BLOBPlayer.deployed();
    seasonContract = await BLOBSeason.deployed();
    registryContract.SetSeasonContract(seasonContract.address);
    registryContract.SetTeamContract(teamContract.address);
    registryContract.SetPlayerContract(playerContract.address);
  });

  it('Should initialize league with proper teams.', async() => {
    await leagueContract.Init();
    const teams = await teamContract.GetAllTeams();
    assert(teams.length === 0);
  });

  it('Should claim 2 teams with proper name and logoUrl.', async() => {
    await leagueContract.ClaimTeam(
      "Lakers", "https://lalakers.com/logo.png",
      {from: accounts[1]}
    );
    let teamId = await teamContract.MyTeamId({from: accounts[1]});
    let newOwnerAddr = await teamContract.ownerOf(parseInt(teamId));
    assert(newOwnerAddr === accounts[1]);

    await leagueContract.ClaimTeam(
      "Warriors", "https://sfwarriorrs.com/logo.png",
      {from: accounts[2]}
    );
    teamId = await teamContract.MyTeamId({from: accounts[2]});
    newOwnerAddr = await teamContract.ownerOf(parseInt(teamId));
    assert(newOwnerAddr === accounts[2]);

    //await leagueContract.ClaimTeam(
    //  "Spurs", "https://saspurs.com/logo.png",
    //  {from: accounts[3]}
    //);
    //teamId = await teamContract.MyTeamId({from: accounts[3]});
    //newOwnerAddr = await teamContract.ownerOf(parseInt(teamId));
    //assert(newOwnerAddr === accounts[3]);

    //await leagueContract.ClaimTeam(
    //  "Heat", "https://miheat.com/logo.png",
    //  {from: accounts[4]}
    //);
    //teamId = await teamContract.MyTeamId({from: accounts[4]});
    //newOwnerAddr = await teamContract.ownerOf(parseInt(teamId));
    //assert(newOwnerAddr === accounts[4]);
  });

  it('Should not be able to play a match in off season.', async() => {
    try {
      await leagueContract.PlayMatch({from: accounts[0]});
      assert(false);
    } catch(e) {
      assert(e.message.includes("Matches can only be played in active season."));
    }
  });

  it('Should schedule games correctly for original teams.', async() => {
    await leagueContract.StartSeason();
    assert(parseInt(await seasonContract.seasonId()) === 0);
    assert(parseInt(await seasonContract.maxMatchRounds()) === 2);
    assert(parseInt(await seasonContract.matchId()) === 2);
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

  it('Should play a consecutive match and end the season.', async() => {
    const player1inSeason = await playerContract.GetPlayer(1);
    //console.log("player1inSeason:", player1inSeason);
    const matchRound = parseInt(await seasonContract.matchRound());
    const matchIndex = parseInt(await seasonContract.matchIndex());
    // check forfeits due to player injuries
    const nextMatch = await seasonContract.matchList(matchIndex);
    const hostTeam = parseInt(nextMatch.hostTeam);
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
  });

  it('Should schedule games correctly after adding one more team.', async() => {

    await leagueContract.ClaimTeam(
      "Clippers", "https://laclippers.com/logo.png",
      {from: accounts[5]}
    );
    let teamId = await teamContract.MyTeamId({from: accounts[5]});
    let newOwnerAddr = await teamContract.ownerOf(parseInt(teamId));
    assert(newOwnerAddr === accounts[5]);

    await leagueContract.StartSeason();

    assert(parseInt(await seasonContract.seasonId()) === 1);
    assert(parseInt(await seasonContract.maxMatchRounds()) === 6);
    assert(parseInt(await seasonContract.matchId()) === 10);
    const lastMatch = await seasonContract.matchList(5);
    assert(lastMatch.matchRound.toNumber() === 5);
    assert(lastMatch.hostTeam.toNumber() === 0);
    assert(lastMatch.guestTeam.toNumber() === 2);
  });

})
