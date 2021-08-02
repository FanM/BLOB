const BLOBRegistry = artifacts.require("BLOBRegistry");
const BLOBLeague = artifacts.require("BLOBLeague");
const BLOBPlayer = artifacts.require("BLOBPlayer");
const BLOBSeason = artifacts.require("BLOBSeason");
const BLOBTeam = artifacts.require("BLOBTeam");
const BLOBMatch = artifacts.require('BLOBMatch');
const BLOBUtils = artifacts.require('BLOBUtils');

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
                            registryAddr)
          }).then((player) => {
            console.log("PlayerContract:" + player.address);
            return deployer.deploy(BLOBTeam,
                    "BLOBTeam",
                    "BLOBTeam",
                    registryAddr);
          }).then((team) => {
            console.log("TeamContract:" + team.address);
            return deployer.deploy(BLOBSeason,
                    registryAddr);
          }).then((season) => {
            console.log("SeasonContract:" + season.address);
            return deployer.deploy(BLOBMatch,
                    registryAddr);
          }).then((match) => {
            console.log("MatchContract:" + match.address);
            return deployer.deploy(BLOBUtils)
          }).then((utils) => {
            console.log("UtilsContract:" + utils.address);
          }).catch(e => {
            console.log("Error:" + e.message);
          });
};
