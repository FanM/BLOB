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
  });

  it('Should not be able to play a match in off season.', async() => {
    try {
      await leagueContract.PlayMatch({from: accounts[0]});
      assert(false);
    } catch(e) {
      assert(e.message.includes("Matches can only be played in active season."));
    }
  });

  it('Should play a match successfully in active season.', async() => {
    //let scores = await teamContract.GetTeamOffenceAndDefence(0);
    //console.log(`Team 0 Offence Score: ${scores[0]}, Defence Score: ${scores[1]}`);
    //scores = await teamContract.GetTeamOffenceAndDefence(1);
    //console.log(`Team 1 Offence Score: ${scores[0]}, Defence Score: ${scores[1]}`);
    await leagueContract.StartSeason();
    assert((await seasonContract.matchRound()).toNumber() === 0);
    // console.log("Balance before: ", await web3.eth.getBalance(accounts[0]));
    await leagueContract.PlayMatch({from: accounts[0]});
    // console.log("Balance after: ", await web3.eth.getBalance(accounts[0]));
    assert((await seasonContract.matchRound()).toNumber() === 1);
    let wins = parseInt(await seasonContract.teamWins[0]);
    let momentum = parseInt(await seasonContract.teamMomentum(0));
    if (wins === 1) {
      assert(momentum === 1);
    }
    if (wins === 0) {
      assert(momentum === -1);
    }
  });
})
