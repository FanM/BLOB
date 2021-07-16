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
    await leagueContract.Init();
    const teams = await teamContract.GetAllTeams();
    assert(teams.length === 0);
  });

  it('Should claim a team with proper name and logoUrl.', async() => {

    await leagueContract.ClaimTeam("Lakers", "https://lalakers.com/logo.png");
    let teamId = parseInt(await teamContract.MyTeamId());
    let newOwnerAddr = await teamContract.ownerOf(teamId);
    assert(newOwnerAddr  === accounts[0]);
    let team = await teamContract.GetTeam(teamId);

    assert(parseInt(team.id) === teamId);
    assert(team.name === 'Lakers');
    assert(team.logoUrl === 'https://lalakers.com/logo.png');
  });

  it('Should not claim more than 1 team.', async() => {
    try {
      await leagueContract.ClaimTeam("Lakers", "https://lalakers.com/logo.png");
      assert(false);
    } catch(e) {
      assert(e.message.includes("You can only claim 1 team."));
    }
  });

  it('Should have team players with proper traits', async() => {
    const playerIds = await teamContract.GetTeamRosterIds(0);
    assert(playerIds.length === 15);
    let player, playerId, playerAge, physicalStrength, shot;
    for (let i=0; i<playerIds.length; i++) {
      playerId = parseInt(playerIds[i]);
      player = await playerContract.GetPlayer(playerId);
      //console.log("Player:", player);
      playerAge = parseInt(player.age);
      physicalStrength = parseInt(player.physicalStrength);
      shot = parseInt(player.shot);
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
      { playerId: 0, playTime: 20, shotAllocation: 8, shot3PAllocation: 8 };
    const gameTime1 =
      { playerId: 1, playTime: 12, shotAllocation: 7, shot3PAllocation: 7 };
    await teamContract.SetPlayersGameTime(0, [gameTime0, gameTime1]);
    assert(true);
  });

  it('Should fail if setting team player game time improperly', async() => {
    const gameTime0 =
      { playerId: 0, playTime: 21, shotAllocation: 10, shot3PAllocation: 10 };
    const gameTime1 =
      { playerId: 1, playTime: 12, shotAllocation: 5, shot3PAllocation: 5 };
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
      { playerId: 1, playTime: 12, shotAllocation: 5, shot3PAllocation: 5 };
    try {
      await teamContract.SetPlayersGameTime(0, [gameTime0, gameTime1]);
    } catch (e) {
      assert(
        e.message
         .includes("Total shot & shot3Point allocations must account for 100%"));
    }
  });

  it('Should claim a team from another account with proper name and logoUrl.', async() => {
    await leagueContract.ClaimTeam(
      "Warriors", "https://sfwarriorrs.com/logo.png",
      {from: accounts[1]});
    let teamId = parseInt(await teamContract.MyTeamId({from: accounts[1]}));
    let newOwnerAddr = await teamContract.ownerOf(teamId);
    assert(newOwnerAddr  === accounts[1]);

    const team = await teamContract.GetTeam(teamId);
    assert(parseInt(team.id) === teamId);
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
