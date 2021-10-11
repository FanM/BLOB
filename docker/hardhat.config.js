require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-truffle5");
require("hardhat-tracer");
const { mnemonic } = require("./secrets.json");

const { extendEnvironment } = require("hardhat/config");
const blobContracts = require("./blob_contracts.json");
const BLOBLeagueContract = require("./BLOBLeague.sol/BLOBLeague.json");
const BLOBSeasonContract = require("./BLOBSeason.sol/BLOBSeason.json");

task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
    const balance = await web3.eth.getBalance(account.address);

    console.log(web3.utils.fromWei(balance, "ether"), "ETH");
  }
});

// inject web3 to hardhat runtime
const extendEnv = () =>
  extendEnvironment((hre) => {
    const Web3 = require("web3");
    hre.Web3 = Web3;
    hre.web3 = new Web3(new Web3HTTPProviderAdapter(hre.network.provider));
  });

task("start-season", "Start an active season")
  .addParam("startdate", "Starting date, in YYYY-MM-DD format")
  .addParam("gamehours", "Game hours per day separated by ',', i.e 10,20,22")
  .setAction(async (taskArgs, hre) => {
    extendEnv();
    const startDate = new Date(taskArgs.startdate);
    const gameHours = taskArgs.gamehours.split(",", 144);

    // get admin account
    const account = (await hre.ethers.getSigners())[0].address;

    // get contract instances
    const leagueContract = new hre.web3.eth.Contract(
      BLOBLeagueContract.abi,
      blobContracts.BLOBLeague
    );
    const schedule = {
      startDate: startDate.getTime() / 1000,
      gameHours: gameHours.map((h) => h * 3600),
    };

    await leagueContract.methods
      .StartSeason(schedule)
      .send({ from: account })
      .then(() => console.log(`Season started successfully.`))
      .catch((e) => console.error(e.message));
  });

task("play-game-round", "Play a round of games", async (taskArgs, hre) => {
  extendEnv();
  // get admin account
  const account = (await hre.ethers.getSigners())[0].address;

  // get contract instances
  const leagueContract = new hre.web3.eth.Contract(
    BLOBLeagueContract.abi,
    blobContracts.BLOBLeague
  );
  const seasonContract = new hre.web3.eth.Contract(
    BLOBSeasonContract.abi,
    blobContracts.BLOBSeason
  );

  let seasonState = await seasonContract.methods.seasonState().call();
  const startRound = await seasonContract.methods.matchRound().call();
  let currentRound = startRound;
  try {
    while (currentRound === startRound && seasonState === "0") {
      await leagueContract.methods.PlayMatch().send({ from: account });
      currentRound = await seasonContract.methods.matchRound().call();
      seasonState = await seasonContract.methods.seasonState().call();
    }
    console.log(`Round ${startRound} has finished successfully.`);
  } catch (e) {
    console.log(e.message);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    hardhat: {},
    testnet: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545",
      chainId: 97,
      gas: 20000000,
      gasPrice: 11000000000,
      accounts: [`0x${mnemonic}`],
    },
    mainnet: {
      url: "https://bsc-dataseed.binance.org/",
      chainId: 56,
      gasPrice: 20000000000,
      accounts: [`0x${mnemonic}`],
    },
  },
  solidity: {
    version: "0.8.6",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
      evmVersion: "byzantium",
    },
  },
  paths: {
    artifacts: "./client/src/contracts",
  },
  mocha: {
    timeout: 30000,
  },
};
