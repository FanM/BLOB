const BLOBRegistry = artifacts.require("BLOBRegistry");
const BLOBLeague = artifacts.require("BLOBLeague");
const BLOBPlayer = artifacts.require("BLOBPlayer");
const BLOBSeason = artifacts.require("BLOBSeason");
const BLOBTeam = artifacts.require("BLOBTeam");
const BLOBMatch = artifacts.require("BLOBMatch");
const BLOBUtils = artifacts.require("BLOBUtils");

module.exports = async () => {
  const registryContract = await BLOBRegistry.new();
  BLOBRegistry.setAsDeployed(registryContract);

  const leagueContract = await BLOBLeague.new(
    registryContract.address
  );
  BLOBLeague.setAsDeployed(leagueContract);

  const playerContract = await BLOBPlayer.new(
    "BLOBPlayer",
    "BLOBPlayer",
    registryContract.address
  );
  BLOBPlayer.setAsDeployed(playerContract);

  const teamContract = await BLOBTeam.new(
    "BLOBTeam",
    "BLOBTeam",
    registryContract.address
  );
  BLOBTeam.setAsDeployed(teamContract);

  const seasonContract = await BLOBSeason.new(
    registryContract.address
  )
  BLOBSeason.setAsDeployed(seasonContract);

  const matchContract = await BLOBMatch.new(
    registryContract.address
  )
  BLOBMatch.setAsDeployed(matchContract);

  const utilsContract = await BLOBUtils.new()
  BLOBUtils.setAsDeployed(utilsContract);
};
