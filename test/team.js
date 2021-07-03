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

  it('Should not claim nonexisting team.', async() => {
    leagueContract.ClaimTeam(10, "Lakers", "https://lalakers.com/logo.png")
                  .catch((e) => {
                    assert(e.message.includes("Team id is not available for claim."))
                  });
  });

  it('Should have team players with proper traits', async() => {
    const players = await teamContract.GetTeamRoster(0); // Center
    assert(players.length === 15);
    for (let i=0; i<players.length; i++) {
      //console.log("Player:", players[i]);
      playerAge = parseInt(players[i].age);
      physicalStrength = parseInt(players[i].physicalStrength);
      assert(playerAge>=20 && playerAge <= 40);
      assert(physicalStrength>=40 && physicalStrength <= 100);
    }
  });

})
