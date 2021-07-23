const BLOBRegistry = artifacts.require("BLOBRegistry");
const BLOBLeague = artifacts.require("BLOBLeague");
const BLOBPlayer = artifacts.require("BLOBPlayer");
const BLOBSeason = artifacts.require("BLOBSeason");
const BLOBTeam = artifacts.require("BLOBTeam");

module.exports = function (deployer) {
  let registryAddr;
  let leagueAddr;
  deployer.deploy(BLOBRegistry)
          .then((registry) => {
            console.log("RegistryContract:" + registry.address);
            registryAddr = registry.address;
            return deployer.deploy(BLOBLeague,
                            registryAddr)
          }).then((league) => {
            console.log("LeagueContract:" + league.address);
            leagueAddr = league.address;
            return deployer.deploy(BLOBPlayer,
                            "BLOBPlayer",
                            "BLOBPlayer",
                            "",
                            leagueAddr)
          }).then((player) => {
            console.log("PlayerContract:" + player.address);
            return deployer.deploy(BLOBTeam,
                    "BLOBTeam",
                    "BLOBTeam",
                    "",
                    leagueAddr);
          }).then((team) => {
            console.log("TeamContract:" + team.address);
            return deployer.deploy(BLOBSeason,
                    leagueAddr);
          }).then((season) => {
            console.log("SeasonContract:" + season.address);
          }).catch(e => {
            console.log("Error:" + e.message);
          });
};
