const BLOBRegistry = artifacts.require("BLOBRegistry");
const BLOBLeague = artifacts.require("BLOBLeague");
const BLOBPlayer = artifacts.require("BLOBPlayer");
const BLOBSeason = artifacts.require("BLOBSeason");
const BLOBTeam = artifacts.require("BLOBTeam");

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
    "",
    registryContract.address,
    leagueContract.address
  );
  BLOBPlayer.setAsDeployed(playerContract);

  const teamContract = await BLOBTeam.new(
    "BLOBTeam",
    "BLOBTeam",
    "",
    registryContract.address,
    leagueContract.address
  );
  BLOBTeam.setAsDeployed(teamContract);

  const seasonContract = await BLOBSeason.new(
    registryContract.address,
    leagueContract.address
  )
  BLOBSeason.setAsDeployed(seasonContract);
};
