const BLOBRegistry = artifacts.require("BLOBRegistry");
const BLOBLeague = artifacts.require("BLOBLeague");
const BLOBSeason = artifacts.require("BLOBSeason");
const BLOBTeam = artifacts.require("BLOBTeam");
const BLOBPlayer = artifacts.require("BLOBPlayer");
const BLOBMatch = artifacts.require("BLOBMatch");
const BLOBUtils = artifacts.require("BLOBUtils");
const { parseErrorCode } = require("./error.js");

contract("BLOBTeam", async (accounts) => {
  "use strict";

  let registryContract = null;
  let leagueContract = null;
  let seasonContract = null;
  let teamContract = null;
  let playerContract = null;
  let matchContract = null;
  let utilsContract = null;

  before(async () => {
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

  it("Should initialize league with proper teams.", async () => {
    await leagueContract.Init();
    const teamCount = parseInt(await teamContract.teamCount());
    assert(teamCount === 0);
  });

  it("Should claim a team with proper name and logoUrl.", async () => {
    await teamContract.ClaimTeam("Lakers", "https://lalakers.com/logo.png");
    const teamId = parseInt(await teamContract.MyTeamId());
    const newOwnerAddr = await teamContract.ownerOf(teamId);
    assert(newOwnerAddr === accounts[0]);
    const team = await teamContract.GetTeam(teamId);

    assert(parseInt(team.id) === teamId);
    assert(team.name === "Lakers");
    assert(team.logoUrl === "https://lalakers.com/logo.png");

    const teamSalary = parseInt(await teamContract.teamTotalSalary(teamId));
    assert(
      teamSalary > 0 && (await teamContract.TEAM_SALARY_CAP()).gt(teamSalary)
    );
  });

  it("Should not claim more than 1 team.", async () => {
    try {
      await teamContract.ClaimTeam("Lakers", "https://lalakers.com/logo.png");
      assert(false);
    } catch (e) {
      const errorDesc = await parseErrorCode(e.message, utilsContract);
      assert(errorDesc === "You can only claim 1 team");
    }
  });

  it("Should have team players with proper traits", async () => {
    const playerIds = await teamContract.GetTeamRosterIds(0);
    assert(playerIds.length === 15);
    let player, playerId, playerAge, physicalStrength, shot;
    for (let i = 0; i < playerIds.length; i++) {
      playerId = parseInt(playerIds[i]);
      player = await playerContract.GetPlayer(playerId);
      //console.log("Player:", player);
      playerAge = parseInt(player.age);
      physicalStrength = parseInt(player.physicalStrength);
      shot = parseInt(player.shot);
      assert(playerAge >= 18 && playerAge < 38);
      assert(physicalStrength >= 40 && physicalStrength <= 100);
      assert(shot >= 40 && shot <= 100);
      assert((await playerContract.CanPlay(playerId, 0)) === true);
    }
  });

  it("Should be able to set name and photo url of team player", async () => {
    const playerIds = await teamContract.GetTeamRosterIds(0);
    const name = "Kobe";
    const photoUrl = "https://ipfs.io/kobe.png";
    await teamContract.SetPlayerNameAndImage(playerIds[0], name, photoUrl);
    const player = await playerContract.GetPlayer(playerIds[0]);
    assert(player.name === name);
    assert(player.photoUrl === photoUrl);
    assert((await playerContract.tokenURI(playerIds[0])) === photoUrl);

    try {
      await teamContract.SetPlayerNameAndImage(playerIds[0], name, photoUrl);
      assert(false);
    } catch (e) {
      const errorDesc = await parseErrorCode(e.message, utilsContract);
      assert(errorDesc === "Can only set the name and image of a player once");
    }
  });

  it("Should have team offence & defence scores within proper range", async () => {
    let scores = await matchContract.GetTeamOffenceAndDefence(0, false);
    //console.log(`Offence: ${scores[0]}, Defence: ${scores[1]}`);
    assert(scores[0] > 0 && scores[0] < 100);
    assert(scores[1] > 0 && scores[1] < 100);
  });

  it("Should succeed if setting team player game time properly", async () => {
    const gameTime0 = {
      playerId: 0,
      playTime: 20,
      shotAllocation: 8,
      shot3PAllocation: 8,
      starter: true,
    };
    const gameTime1 = {
      playerId: 1,
      playTime: 12,
      shotAllocation: 7,
      shot3PAllocation: 7,
      starter: false,
    };
    await teamContract.SetPlayersGameTime([gameTime0, gameTime1]);
    const errorCode = await matchContract.ValidateTeamPlayerGameTime(0);
    assert(parseInt(errorCode) == 0);

    let gameTime = await playerContract.GetPlayerGameTime(0);
    assert(parseInt(gameTime.playTime) == 20);
    gameTime = await playerContract.GetPlayerGameTime(1);
    assert(parseInt(gameTime.playTime) == 12);
  });

  it("Should fail if setting team player game time improperly", async () => {
    const gameTime0 = {
      playerId: 0,
      playTime: 21,
      shotAllocation: 10,
      shot3PAllocation: 10,
      starter: true,
    };
    const gameTime1 = {
      playerId: 1,
      playTime: 12,
      shotAllocation: 5,
      shot3PAllocation: 5,
      starter: false,
    };

    await teamContract.SetPlayersGameTime([gameTime0, gameTime1]);
    const errorCode = await matchContract.ValidateTeamPlayerGameTime(0);
    const errorDesc = await utilsContract.errorCodeDescription(errorCode);
    assert(
      errorDesc ===
        "Players of the same position must have play time add up to 48 minutes"
    );
  });

  it("Should fail if setting team player shot allocation improperly", async () => {
    const gameTime0 = {
      playerId: 0,
      playTime: 20,
      shotAllocation: 11,
      shot3PAllocation: 10,
      starter: true,
    };
    const gameTime1 = {
      playerId: 1,
      playTime: 12,
      shotAllocation: 5,
      shot3PAllocation: 5,
      starter: false,
    };

    await teamContract.SetPlayersGameTime([gameTime0, gameTime1]);
    const errorCode = await matchContract.ValidateTeamPlayerGameTime(0);
    const errorDesc = await utilsContract.errorCodeDescription(errorCode);
    assert(
      errorDesc === "Total shot & shot3Point allocations must sum up to 100%"
    );
  });

  it("Should fail if setting team starter improperly", async () => {
    const gameTime0 = {
      playerId: 0,
      playTime: 20,
      shotAllocation: 10,
      shot3PAllocation: 10,
      starter: false,
    };

    await teamContract.SetPlayersGameTime([gameTime0]);
    let errorCode = await matchContract.ValidateTeamPlayerGameTime(0);
    let errorDesc = await utilsContract.errorCodeDescription(errorCode);
    assert(errorDesc === "Starter in each position must be playable");

    const gameTime1 = {
      playerId: 0,
      playTime: 20,
      shotAllocation: 10,
      shot3PAllocation: 10,
      starter: true,
    };
    const gameTime2 = {
      playerId: 1,
      playTime: 12,
      shotAllocation: 5,
      shot3PAllocation: 5,
      starter: true,
    };

    await teamContract.SetPlayersGameTime([gameTime1, gameTime2]);
    errorCode = await matchContract.ValidateTeamPlayerGameTime(0);
    errorDesc = await utilsContract.errorCodeDescription(errorCode);
    assert(errorDesc === "Each position can have only one starter");
  });

  it("Should claim a team from another account with proper name and logoUrl.", async () => {
    await teamContract.ClaimTeam(
      "Warriors",
      "https://sfwarriorrs.com/logo.png",
      { from: accounts[1] }
    );
    let teamId = parseInt(await teamContract.MyTeamId({ from: accounts[1] }));
    let newOwnerAddr = await teamContract.ownerOf(teamId);
    assert(newOwnerAddr === accounts[1]);

    const team = await teamContract.GetTeam(teamId);
    assert(parseInt(team.id) === teamId);
    assert(team.name === "Warriors");
    assert(team.logoUrl === "https://sfwarriorrs.com/logo.png");
  });

  it("Should fail if setting player game time for a team he is not in", async () => {
    const gameTime0 = {
      playerId: 0,
      playTime: 20,
      shotAllocation: 10,
      shot3PAllocation: 10,
    };
    try {
      await teamContract.SetPlayersGameTime([gameTime0], { from: accounts[1] });
      assert(false);
    } catch (e) {
      const errorDesc = await parseErrorCode(e.message, utilsContract);
      assert(errorDesc === "This player does not belong to your team");
    }
  });

  it("Should be able to transfer team to another owner", async () => {
    const teamId = await teamContract.MyTeamId({ from: accounts[1] });
    await teamContract.safeTransferFrom(accounts[1], accounts[2], teamId, {
      from: accounts[1],
    });
    assert(teamId.eq(await teamContract.MyTeamId({ from: accounts[2] })));
  });
});
