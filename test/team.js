const BLOBRegistry = artifacts.require('BLOBRegistry');
const BLOBLeague = artifacts.require('BLOBLeague');
const BLOBSeason = artifacts.require('BLOBSeason');
const BLOBTeam = artifacts.require('BLOBTeam');
const BLOBPlayer = artifacts.require('BLOBPlayer');

contract('BLOBTeam', async accounts => {
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
    await leagueContract.InitLeague();
    const teamCount = await leagueContract.MAX_TEAMS();
    const teams = await teamContract.GetAllTeams();
    assert(teams.length === parseInt(teamCount));
    assert(teams[0].id === '0');
    assert(teams[1].id === '1');
  });

  it('Should not claim nonexisting team.', async() => {
    try {
      await leagueContract.ClaimTeam(10, "Lakers", "https://lalakers.com/logo.png");
      assert(false);
    } catch(e) {
      assert(e.message.includes("Team id is not available for claim."))
    }
  });

  it('Should claim a team with proper name and logoUrl.', async() => {
    let leagueAddr = await teamContract.ownerOf(0);
    assert(leagueAddr === leagueContract.address);

    await leagueContract.ClaimTeam(0, "Lakers", "https://lalakers.com/logo.png");
    let newOwnerAddr = await teamContract.ownerOf(0);
    assert(newOwnerAddr  !== leagueContract.address);

    const team = await teamContract.GetTeam(0);
    assert(team.id === '0');
    assert(team.name === 'Lakers');
    assert(team.logoUrl === 'https://lalakers.com/logo.png');
  });

  it('Should not claim more than 1 team.', async() => {
    try {
      await leagueContract.ClaimTeam(0, "Lakers", "https://lalakers.com/logo.png");
      assert(false);
    } catch(e) {
      assert(e.message.includes("You can only claim 1 team."));
    }
  });

  it('Should have team players with proper traits', async() => {
    const players = await teamContract.GetTeamRoster(0); // Center
    assert(players.length === 15);
    let playerId, playerAge, physicalStrength, shot;
    for (let i=0; i<players.length; i++) {
      //console.log("Player:", players[i]);
      playerId = parseInt(players[i].id);
      playerAge = parseInt(players[i].age);
      physicalStrength = parseInt(players[i].physicalStrength);
      shot = parseInt(players[i].shot);
      assert(playerAge>=20 && playerAge <= 40);
      assert(physicalStrength>=40 && physicalStrength <= 100);
      assert(shot>=40 && shot <= 100);
      assert(await playerContract.CanPlay(playerId, 0) === true);
    }
  });

  it('Should have team offence&defence scores within proper range', async() => {
    let scores = await teamContract.GetTeamOffenceAndDefence(0);
    //console.log("Offence Score: " + score[0]);
    assert(scores[0] > 0 && scores[0] < 100);
    assert(scores[1] > 0 && scores[1] < 100);
  });

  it('Should succeed if setting team player game time properly', async() => {
    const gameTime0 =
      { playerId: 0, playTime: 20, shotAllocation: 10, shot3PAllocation: 10 };
    const gameTime1 =
      { playerId: 1, playTime: 12, shotAllocation: 10, shot3PAllocation: 10 };
    await teamContract.SetPlayersGameTime(0, [gameTime0, gameTime1]);
    assert(true);
  });

  it('Should fail if setting team player game time improperly', async() => {
    const gameTime0 =
      { playerId: 0, playTime: 21, shotAllocation: 10, shot3PAllocation: 10 };
    const gameTime1 =
      { playerId: 1, playTime: 12, shotAllocation: 10, shot3PAllocation: 10 };
    try {
      await teamContract.SetPlayersGameTime(0, [gameTime0, gameTime1]);
    } catch (e) {
      assert(
        e.message
         .includes("Players of the same position must have play time add up to 48 minutes"));
    }
  });

  it('Should fail if setting team player shot allocation improperly', async() => {
    const gameTime0 =
      { playerId: 0, playTime: 20, shotAllocation: 11, shot3PAllocation: 10 };
    const gameTime1 =
      { playerId: 1, playTime: 12, shotAllocation: 10, shot3PAllocation: 10 };
    try {
      await teamContract.SetPlayersGameTime(0, [gameTime0, gameTime1]);
    } catch (e) {
      assert(
        e.message
         .includes("Total shot & shot3Point allocations must account for 100%"));
    }
  });

  it('Should claim a team from another account with proper name and logoUrl.', async() => {
    let leagueAddr = await teamContract.ownerOf(1);
    assert(leagueAddr === leagueContract.address);

    await leagueContract.ClaimTeam(
      1,
      "Warriors", "https://sfwarriorrs.com/logo.png",
      {from: accounts[1]});
    let newOwnerAddr = await teamContract.ownerOf(1);
    assert(newOwnerAddr  === accounts[1]);

    const team = await teamContract.GetTeam(1);
    assert(team.id === '1');
    assert(team.name === 'Warriors');
    assert(team.logoUrl === 'https://sfwarriorrs.com/logo.png');
  });

  it('Should fail if setting player game time for a team not owned', async() => {
    const gameTime0 =
      { playerId: 0, playTime: 20, shotAllocation: 10, shot3PAllocation: 10 };
    try {
      await teamContract.SetPlayersGameTime(
        0,
        [gameTime0],
        {from: accounts[1]});
      assert(false);
    } catch(e) {
      assert(e.message.includes("You do not own this team."));
    }
  });

  it('Should fail if setting player game time for a team he is not in', async() => {
    const gameTime0 =
      { playerId: 0, playTime: 20, shotAllocation: 10, shot3PAllocation: 10 };
    try {
      await teamContract.SetPlayersGameTime(
        1,
        [gameTime0],
        {from: accounts[1]});
      assert(false);
    } catch(e) {
      assert(e.message.includes("This player does not belong to this team."));
    }
  });

})
