const BLOBRegistry = artifacts.require("BLOBRegistry");
const BLOBLeague = artifacts.require("BLOBLeague");
const BLOBSeason = artifacts.require("BLOBSeason");
const BLOBTeam = artifacts.require("BLOBTeam");
const BLOBPlayer = artifacts.require("BLOBPlayer");
const BLOBMatch = artifacts.require("BLOBMatch");
const BLOBUtils = artifacts.require("BLOBUtils");
const { parseErrorCode } = require("./error.js");

contract("BLOBLeague", async (accounts) => {
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

  it("Should claim 4 teams with proper name and logoUrl.", async () => {
    await teamContract.ClaimTeam("Lakers", "https://lalakers.com/logo.png", {
      from: accounts[1],
    });
    let teamId = await teamContract.MyTeamId({ from: accounts[1] });
    let newOwnerAddr = await teamContract.ownerOf(parseInt(teamId));
    assert(newOwnerAddr === accounts[1]);

    await teamContract.ClaimTeam(
      "Warriors",
      "https://sfwarriorrs.com/logo.png",
      { from: accounts[2] }
    );
    teamId = await teamContract.MyTeamId({ from: accounts[2] });
    newOwnerAddr = await teamContract.ownerOf(parseInt(teamId));
    assert(newOwnerAddr === accounts[2]);

    await teamContract.ClaimTeam("Spurs", "https://saspurs.com/logo.png", {
      from: accounts[3],
    });
    teamId = await teamContract.MyTeamId({ from: accounts[3] });
    newOwnerAddr = await teamContract.ownerOf(parseInt(teamId));
    assert(newOwnerAddr === accounts[3]);

    await teamContract.ClaimTeam("Heat", "https://miheat.com/logo.png", {
      from: accounts[4],
    });
    teamId = await teamContract.MyTeamId({ from: accounts[4] });
    newOwnerAddr = await teamContract.ownerOf(parseInt(teamId));
    assert(newOwnerAddr === accounts[4]);

    assert(parseInt(await teamContract.teamCount()) == 4);
  });

  it("Should be able to propose trade transaction.", async () => {
    await teamContract.ProposeTradeTx(1, [0], [15], { from: accounts[1] });
    const tradeTxList = await leagueContract.GetActiveTradeTxList();
    assert(tradeTxList.length === 1);
    assert(parseInt(tradeTxList[0].status) === 0);
    assert(parseInt(tradeTxList[0].initiatorTeam) === 0);
    assert(parseInt(tradeTxList[0].counterpartyTeam) == 1);
    assert.deepEqual(tradeTxList[0].initiatorPlayers, ["0"]);
  });

  it("Should not be able to cancel/reject trade transaction if not from the proper team.", async () => {
    const tradeTxList = await leagueContract.GetActiveTradeTxList();
    const tradeTxId = parseInt(tradeTxList[0].id);
    const initiator = parseInt(tradeTxList[0].initiatorTeam);
    const counterparty = parseInt(tradeTxList[0].counterpartyTeam);
    try {
      await teamContract.RejectTradeTx(tradeTxId, {
        from: accounts[initiator + 1],
      }); //initiator
      assert(false);
    } catch (e) {
      const errorDesc = await parseErrorCode(e.message, utilsContract);
      assert(
        errorDesc === "Can only act on transactions proposed to your own team"
      );
    }

    try {
      await teamContract.CancelTradeTx(tradeTxId, {
        from: accounts[counterparty + 1],
      }); //counterparty
      assert(false);
    } catch (e) {
      const errorDesc = await parseErrorCode(e.message, utilsContract);
      assert(
        errorDesc === "Can only act on transactions initiated by your own team"
      );
    }
  });

  it("Should be able to reject trade transaction if from the proper team.", async () => {
    let tradeTx = await leagueContract.GetActiveTradeTx(0);
    const counterparty = parseInt(tradeTx.counterpartyTeam);
    await teamContract.RejectTradeTx(tradeTx.id, {
      from: accounts[counterparty + 1],
    }); //counterparty

    try {
      tradeTx = await leagueContract.GetActiveTradeTx(tradeTx.id);
      assert(false);
    } catch (e) {
      const errorDesc = await parseErrorCode(e.message, utilsContract);
      assert(errorDesc === "Can only act on active TradeTx");
    }

    try {
      await teamContract.RejectTradeTx(tradeTx.id, {
        from: accounts[counterparty + 1],
      }); //counterparty
      assert(false);
    } catch (e) {
      const errorDesc = await parseErrorCode(e.message, utilsContract);
      assert(errorDesc === "Can only act on active TradeTx");
    }
  });

  it("Should be able to complete a trade transaction.", async () => {
    const teamId = await teamContract.MyTeamId({ from: accounts[1] });
    await teamContract.ProposeTradeTx(
      1,
      [0, 1, 2, 3, 4],
      [15, 16, 17, 18, 19],
      {
        from: accounts[1],
      }
    );
    assert(parseInt(await leagueContract.teamActiveTxCount(teamId)) === 1);
    let tradeTxList = await leagueContract.GetActiveTradeTxList();
    assert(tradeTxList.length === 1);
    let tradeTx = tradeTxList[0];
    const counterparty = parseInt(tradeTx.counterpartyTeam);
    const initiator = parseInt(tradeTx.initiatorTeam);
    await teamContract.AcceptTradeTx(tradeTx.id, {
      from: accounts[counterparty + 1],
    }); //counterparty
    tradeTxList = await leagueContract.GetActiveTradeTxList();
    assert(tradeTxList.length === 0);
    assert(parseInt(await leagueContract.teamActiveTxCount(teamId)) === 0);

    assert(
      await teamContract.TeamPlayersExist(initiator, [15, 16, 17, 18, 19])
    );
    assert(await teamContract.TeamPlayersExist(counterparty, [0, 1, 2, 3, 4]));
    let gameTime = await playerContract.GetPlayerGameTime(15);
    assert(parseInt(gameTime.playTime) === 0);
    gameTime = await playerContract.GetPlayerGameTime(0);
    assert(parseInt(gameTime.playTime) === 0);
  });

  it("Should be able to clear trade transactions when season starts.", async () => {
    const teamId = await teamContract.MyTeamId({ from: accounts[1] });
    for (let i = 0; i < 10; i++) {
      await teamContract.ProposeTradeTx(1, [15, 16], [0, 1], {
        from: accounts[1],
      });
    }
    let tradeTxList = await leagueContract.GetActiveTradeTxList();
    assert(tradeTxList.length === 10);
    assert(parseInt(await leagueContract.teamActiveTxCount(teamId)) === 10);

    const now = new Date();
    const schedule = {
      startDate:
        new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - 1
        ).getTime() / 1000,
      gameHours: [8 * 3600, 12 * 3600],
    };
    await leagueContract.StartSeason(schedule);
    tradeTxList = await leagueContract.GetActiveTradeTxList();
    assert(tradeTxList.length === 0);
    assert(parseInt(await leagueContract.teamActiveTxCount(teamId)) === 0);
  });
});
