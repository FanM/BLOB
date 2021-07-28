const BLOBRegistry = artifacts.require('BLOBRegistry');
const BLOBLeague = artifacts.require('BLOBLeague');
const BLOBSeason = artifacts.require('BLOBSeason');
const BLOBTeam = artifacts.require('BLOBTeam');
const BLOBPlayer = artifacts.require('BLOBPlayer');
const BLOBMatch = artifacts.require('BLOBMatch');
const BLOBUtils = artifacts.require('BLOBUtils');
const { parseErrorCode } = require('./error.js');

contract('BLOBLeague', async accounts => {
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

  it('Should claim 4 teams with proper name and logoUrl.', async() => {
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

    await teamContract.ClaimTeam(
      "Spurs", "https://saspurs.com/logo.png",
      {from: accounts[3]}
    );
    teamId = await teamContract.MyTeamId({from: accounts[3]});
    newOwnerAddr = await teamContract.ownerOf(parseInt(teamId));
    assert(newOwnerAddr === accounts[3]);

    await teamContract.ClaimTeam(
      "Heat", "https://miheat.com/logo.png",
      {from: accounts[4]}
    );
    teamId = await teamContract.MyTeamId({from: accounts[4]});
    newOwnerAddr = await teamContract.ownerOf(parseInt(teamId));
    assert(newOwnerAddr === accounts[4]);

    assert(parseInt(await teamContract.teamCount()) == 4);
  });

  it('Should not be able to draft player if team does not follow draft rules.',
      async() => {
    await leagueContract.StartDraft();
    try {
      await leagueContract.StartDraft();
      assert(false);
    } catch(e) {
      const errorDesc = await parseErrorCode(e.message, utilsContract );
      assert(errorDesc === "Draft has already started");
    }
    const draftPlayerIds = await leagueContract.GetDraftPlayerList();
    const ranking = await seasonContract.GetTeamRanking();
    try {
      // pick a player from a team holding the second pick
      await teamContract.DraftPlayer(
        draftPlayerIds[0],
        {from: accounts[1+parseInt(ranking[ranking.length-2])]});
      assert(false);
    } catch(e) {
      const errorDesc = await parseErrorCode(e.message, utilsContract );
      assert(errorDesc === "It is not your turn to pick player");
    }

    try {
      // pick a player that doesn't exist
      await teamContract.DraftPlayer(
        1000,
        {from: accounts[1+parseInt(ranking[ranking.length-1])]});
      assert(false);
    } catch(e) {
      const errorDesc = await parseErrorCode(e.message, utilsContract );
      assert(errorDesc === "Player is not eligible for draft");
    }
  });

  it('Should be able to pick a player once in the time slot.', async() => {
    const draftPlayerIds = await leagueContract.GetDraftPlayerList();
    const ranking = await seasonContract.GetTeamRanking();
    const teamId = ranking[ranking.length-1];
    const teamSalaryBefore =
              parseInt(await teamContract.teamSalary(teamId));
    const playerToPick = await playerContract.GetPlayer(draftPlayerIds[2]);

    await teamContract.DraftPlayer(
      playerToPick.id,
      {from: accounts[1+parseInt(teamId)]});
    const players = await teamContract.GetTeamRosterIds(ranking[ranking.length-1]);
    // the draft pool has shrunk by 1
    assert(draftPlayerIds.length - 1 ==
            (await leagueContract.GetDraftPlayerList()).length);
    // the last player in the team is the newly drafted one
    assert(players[players.length-1].eq(draftPlayerIds[2]));

    const teamSalaryAfter =
              parseInt(await teamContract.teamSalary(teamId));
    // the team salary can match
    assert(teamSalaryBefore + parseInt(playerToPick.salary) === teamSalaryAfter);

    try {
      // pick a player again in the same time slot
      await teamContract.DraftPlayer(
        draftPlayerIds[1],
        {from: accounts[1+parseInt(teamId)]});
      assert(false);
    } catch(e) {
      const errorDesc = await parseErrorCode(e.message, utilsContract );
      assert(errorDesc === "It is not your turn to pick player");
    }

    try {
      // pick the same player again in the same time slot
      await teamContract.DraftPlayer(
        playerToPick.id,
        {from: accounts[1+parseInt(teamId)]});
      assert(false);
    } catch(e) {
      const errorDesc = await parseErrorCode(e.message, utilsContract );
      assert(errorDesc === "Player is not eligible for draft");
    }
  });

  it('Should be able to end the draft properly.', async() => {
    const draftPlayerIds = await leagueContract.GetDraftPlayerList();
    const draftListSize = draftPlayerIds.length;
    await leagueContract.EndDraft();
    try {
      const draftPlayerIds = await leagueContract.GetDraftPlayerList();
      assert(false);
    } catch(e) {
      const errorDesc = await parseErrorCode(e.message, utilsContract );
      assert(errorDesc === "Can only act in a draft");
    }
    const undraftedPlayerIds = await leagueContract.GetUndraftedPlayerList();
    assert(undraftedPlayerIds.length === draftListSize);
  });

  it('Should be able to propose trade transaction.', async() => {
    await teamContract.ProposeTradeTx(1,
                                      [0],
                                      [15],
                                      {from: accounts[1]});
    const tradeTxList = await leagueContract.GetTradeTxList();
    assert(tradeTxList.length === 1);
    assert(parseInt(tradeTxList[0].status) === 0);
    assert(parseInt(tradeTxList[0].initiatorTeam) === 0);
    assert(parseInt(tradeTxList[0].counterpartyTeam) == 1);
    assert.deepEqual(tradeTxList[0].initiatorPlayers, ['0']);
  });

  it('Should not be able to cancel/reject trade transaction if not from the proper team.',
    async() => {
    const tradeTxList = await leagueContract.GetTradeTxList();
    const tradeTxId = parseInt(tradeTxList[0].id);
    const initiator = parseInt(tradeTxList[0].initiatorTeam);
    const counterparty = parseInt(tradeTxList[0].counterpartyTeam);
    try {
      await teamContract.RejectTradeTx(tradeTxId, {from: accounts[initiator+1]}); //initiator
      assert(false);
    } catch(e) {
      const errorDesc = await parseErrorCode(e.message, utilsContract );
      assert(errorDesc === "Can only act on transactions proposed to your own team");
    }

    try {
      await teamContract.CancelTradeTx(tradeTxId, {from: accounts[counterparty+1]}); //counterparty
      assert(false);
    } catch(e) {
      const errorDesc = await parseErrorCode(e.message, utilsContract );
      assert(errorDesc === "Can only act on transactions initiated by your own team");
    }
  });

  it('Should be able to reject trade transaction if from the proper team.',
      async() => {
    let tradeTx = await leagueContract.GetTradeTx(0);
    const counterparty = parseInt(tradeTx.counterpartyTeam);
    await teamContract.RejectTradeTx(tradeTx.id, {from: accounts[counterparty+1]}); //counterparty

    tradeTx = await leagueContract.GetTradeTx(0);
    assert(parseInt(tradeTx.status) === 2);

    try {
      await teamContract.RejectTradeTx(tradeTx.id, {from: accounts[counterparty+1]}); //counterparty
      assert(false);
    } catch(e) {
      const errorDesc = await parseErrorCode(e.message, utilsContract );
      assert(errorDesc === "Can only act on active TradeTx");
    }
  });

  it('Should be able to complete a trade transaction.', async() => {
    await teamContract.ProposeTradeTx(1,
                                      [0, 1],
                                      [15, 16],
                                      {from: accounts[1]});
    const tradeTxList = await leagueContract.GetTradeTxList();
    assert(tradeTxList.length === 2);
    let tradeTx = tradeTxList[1];
    const counterparty = parseInt(tradeTx.counterpartyTeam);
    const initiator = parseInt(tradeTx.initiatorTeam);
    await teamContract.AcceptTradeTx(tradeTx.id, {from: accounts[counterparty+1]}); //counterparty
    tradeTx = await leagueContract.GetTradeTx(1);
    assert(parseInt(tradeTx.status) === 3);

    assert(await teamContract.TeamPlayersExist(initiator, [15, 16]));
    assert(await teamContract.TeamPlayersExist(counterparty, [0, 1]));

    try {
      await teamContract.AcceptTradeTx(tradeTx.id, {from: accounts[counterparty+1]}); //counterparty
      assert(false);
    } catch(e) {
      const errorDesc = await parseErrorCode(e.message, utilsContract );
      assert(errorDesc === "Can only act on active TradeTx");
    }
  });

  it('Should be able to clear trade transactions when season starts.', async() => {
    await leagueContract.StartSeason();
    const tradeTxList = await leagueContract.GetTradeTxList();
    assert(tradeTxList.length === 0);
  });

})
