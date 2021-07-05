const BLOBRegistry = artifacts.require('BLOBRegistry');
const BLOBLeague = artifacts.require('BLOBLeague');
const BLOBTeam = artifacts.require('BLOBTeam');
const BLOBPlayer = artifacts.require('BLOBPlayer');

contract('BLOBTeam', () => {
  let registryContract = null;
  let leagueContract = null;
  let teamContract = null;
  let playerContract = null;

  before(async() => {
    registryContract = await BLOBRegistry.deployed();
    leagueContract = await BLOBLeague.deployed();
    teamContract = await BLOBTeam.deployed();
    playerContract = await BLOBPlayer.deployed();
    registryContract.SetTeamContract(teamContract.address);
    registryContract.SetPlayerContract(playerContract.address);
  });

  it('Should initialize league with proper teams.', async() => {
    await leagueContract.InitLeague();
    const teamCount = await leagueContract.maxTeams();
    const teams = await teamContract.GetAllTeams();
    assert(teams.length === parseInt(teamCount));
    assert(teams[0].id === '0');
    assert(teams[1].id === '1');
  });

  it('Should not claim nonexisting team.', async() => {
    leagueContract.ClaimTeam(10, "Lakers", "https://lalakers.com/logo.png")
                  .catch((e) => {
                    assert(e.message.includes("Team id is not available for claim."))
                  });
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
    leagueContract.ClaimTeam(0, "Lakers", "https://lalakers.com/logo.png")
                  .catch((e) => {
                    assert(e.message.includes("You can only claim 1 team."))
                  });
  });

  it('Should have team players with proper traits', async() => {
    const players = await teamContract.GetTeamRoster(0); // Center
    assert(players.length === 15);
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

  it('Should have team offence score within proper range', async() => {
    let offenceScore = await teamContract.GetTeamOffence(0, 0);
    console.log("Offence Score: " + offenceScore);
    assert(offenceScore >= 0 && offenceScore <= 100);
  });

  it('Should have team defence score within proper range', async() => {
    let defenceScore = await teamContract.GetTeamDefence(0, 0);
    console.log("Defence Score: " + defenceScore);
    assert(defenceScore >= 0 && defenceScore <= 100);
  });

  it('Should succeed if setting team player game time properly', async() => {
    assert(await teamContract.VerifyTeamPlayerGameTime(0, 0) === true);
    const gameTime0 =
      { playerId: 0, playTime: 20, shotAllocation: 10, shot3PAllocation: 10 };
    const gameTime1 =
      { playerId: 1, playTime: 12, shotAllocation: 10, shot3PAllocation: 10 };
    await teamContract.SetPlayersGameTime(0, [gameTime0, gameTime1]);
    assert(await teamContract.VerifyTeamPlayerGameTime(0, 0) === true);
  });

  it('Should fail if setting team player game time improperly', async() => {
    const gameTime0 =
      { playerId: 0, playTime: 21, shotAllocation: 10, shot3PAllocation: 10 };
    const gameTime1 =
      { playerId: 1, playTime: 12, shotAllocation: 10, shot3PAllocation: 10 };
    await teamContract.SetPlayersGameTime(0, [gameTime0, gameTime1]);
    assert(await teamContract.VerifyTeamPlayerGameTime(0, 0) === false);
  });

  it('Should fail if setting team player shot allocation improperly', async() => {
    const gameTime0 =
      { playerId: 0, playTime: 20, shotAllocation: 11, shot3PAllocation: 10 };
    const gameTime1 =
      { playerId: 1, playTime: 12, shotAllocation: 10, shot3PAllocation: 10 };
    await teamContract.SetPlayersGameTime(0, [gameTime0, gameTime1]);
    assert(await teamContract.VerifyTeamPlayerGameTime(0, 0) === false);
  });
})