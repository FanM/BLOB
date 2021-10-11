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

task("play-game-round", "Play a round of games", async (taskArgs, hre) => {
  extendEnvironment((hre) => {
    const Web3 = require("web3");
    hre.Web3 = Web3;
    hre.web3 = new Web3(new Web3HTTPProviderAdapter(hre.network.provider));
  });

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

  const startRound = await seasonContract.methods.matchRound().call();
  let currentRound = startRound;
  while (currentRound === startRound) {
    try {
      await leagueContract.methods.PlayMatch().send({ from: account });
      currentRound = await seasonContract.methods.matchRound().call();
    } catch (e) {
      console.log(e.message);
      break;
    }
  }
  console.log(`Round ${startRound} has finished successfully.`);
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
