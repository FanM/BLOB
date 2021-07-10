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

  it('Should claim 4 teams with proper name and logoUrl.', async() => {
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

    await leagueContract.ClaimTeam(
      "Spurs", "https://saspurs.com/logo.png",
      {from: accounts[3]}
    );
    teamId = await teamContract.MyTeamId({from: accounts[3]});
    newOwnerAddr = await teamContract.ownerOf(parseInt(teamId));
    assert(newOwnerAddr === accounts[3]);

    await leagueContract.ClaimTeam(
      "Heat", "https://miheat.com/logo.png",
      {from: accounts[4]}
    );
    teamId = await teamContract.MyTeamId({from: accounts[4]});
    newOwnerAddr = await teamContract.ownerOf(parseInt(teamId));
    assert(newOwnerAddr === accounts[4]);
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
    assert(parseInt(await seasonContract.maxMatchRounds()) === 3);
    assert(parseInt(await seasonContract.matchId()) === 6);
    let lastMatch = await seasonContract.matchList(5);
    assert(lastMatch.matchRound.toNumber() === 2);
    assert(lastMatch.hostTeam.toNumber() === 2);
    assert(lastMatch.guestTeam.toNumber() === 0);
  });

  it('Should play a match successfully in active season.', async() => {
    assert((await seasonContract.matchRound()).toNumber() === 0);
    // console.log("Balance before: ", await web3.eth.getBalance(accounts[0]));
    await leagueContract.PlayMatch({from: accounts[0]});
    // console.log("Balance after: ", await web3.eth.getBalance(accounts[0]));
    let firstMatch = await seasonContract.matchList(0);
    let hostTeam = firstMatch.hostTeam.toNumber();
    let wins = parseInt(await seasonContract.teamWins[hostTeam]);
    let momentum = parseInt(await seasonContract.teamMomentum(hostTeam));
    if (wins === 1) {
      assert(momentum === 1);
    }
    if (wins === 0) {
      assert(momentum === -1);
    }
  });

  it('Should play consecutive matches and update match round.', async() => {
    await leagueContract.PlayMatch({from: accounts[0]});
    await leagueContract.PlayMatch({from: accounts[0]});
    assert(parseInt(await seasonContract.matchRound()) === 1);
    assert(parseInt(await seasonContract.matchIndex()) === 3);
  });

  it('Should schedule games correctly after adding one more team.', async() => {
    await leagueContract.EndSeason(); // ends previous season

    await leagueContract.ClaimTeam(
      "Clippers", "https://laclippers.com/logo.png",
      {from: accounts[5]}
    );
    let teamId = await teamContract.MyTeamId({from: accounts[5]});
    let newOwnerAddr = await teamContract.ownerOf(parseInt(teamId));
    assert(newOwnerAddr === accounts[5]);

    await leagueContract.StartSeason();

    assert(parseInt(await seasonContract.seasonId()) === 1);
    assert(parseInt(await seasonContract.maxMatchRounds()) === 5);
    assert(parseInt(await seasonContract.matchId()) === 16);
    let lastMatch = await seasonContract.matchList(9);
    assert(lastMatch.matchRound.toNumber() === 4);
    assert(lastMatch.hostTeam.toNumber() === 4);
    assert(lastMatch.guestTeam.toNumber() === 0);
  });

})
