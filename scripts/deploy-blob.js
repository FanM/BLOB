// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const fs = require("fs");

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');
  let contracts = {};

  // We get the contract to deploy
  const BLOBRegistry = await hre.ethers.getContractFactory("BLOBRegistry");
  const registryContract = await BLOBRegistry.deploy();
  await registryContract.deployed();
  console.log("BLOBRegistry deployed to:", registryContract.address);
  contracts.BLOBRegistry = registryContract.address;

  const BLOBLeague = await hre.ethers.getContractFactory("BLOBLeague");
  const leagueContract = await BLOBLeague.deploy(
    registryContract.address
  );
  await leagueContract.deployed();
  console.log("BLOBLeague deployed to:", leagueContract.address);
  contracts.BLOBLeague = leagueContract.address;

  const BLOBPlayer = await hre.ethers.getContractFactory("BLOBPlayer");
  const playerContract = await BLOBPlayer.deploy(
    "BLOBPlayer",
    "BLOBPlayer",
    registryContract.address
  );
  await playerContract.deployed();
  console.log("BLOBPlayer deployed to:", playerContract.address);
  contracts.BLOBPlayer = playerContract.address;

  const BLOBTeam = await hre.ethers.getContractFactory("BLOBTeam");
  const teamContract = await BLOBTeam.deploy(
    "BLOBTeam",
    "BLOBTeam",
    registryContract.address
  );
  await teamContract.deployed();
  console.log("BLOBTeam  deployed to:", teamContract.address);
  contracts.BLOBTeam = teamContract.address;

  const BLOBSeason = await hre.ethers.getContractFactory("BLOBSeason");
  const seasonContract = await BLOBSeason.deploy(
    registryContract.address,
  );
  await seasonContract.deployed();
  console.log("BLOBSeason deployed to:", seasonContract.address);
  contracts.BLOBSeason = seasonContract.address;

  const BLOBMatch = await hre.ethers.getContractFactory("BLOBMatch");
  const matchContract = await BLOBMatch.deploy(
    registryContract.address,
  );
  await matchContract.deployed();
  console.log("BLOBMatch deployed to:", matchContract.address);
  contracts.BLOBMatch = matchContract.address;

  const BLOBUtils = await hre.ethers.getContractFactory("BLOBUtils");
  const utilsContract = await BLOBUtils.deploy();
  await utilsContract .deployed();
  console.log("BLOBUtils deployed to:", utilsContract .address);
  contracts.BLOBUtils = utilsContract.address;

  fs.writeFile('client/src/blob_contracts.json', JSON.stringify(contracts), 'utf8', (err) =>{
    if (err)
      throw err;
    console.log("Wrote contract addresses to blob_contracts.json");
  });

  await registryContract.SetLeagueContract(leagueContract.address);
  await registryContract.SetSeasonContract(seasonContract.address);
  await registryContract.SetTeamContract(teamContract.address);
  await registryContract.SetPlayerContract(playerContract.address);
  await registryContract.SetMatchContract(matchContract.address);
  console.log("BLOBRegistry initialized");

  await leagueContract.Init();
  console.log("BLOBLeague initialized");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
