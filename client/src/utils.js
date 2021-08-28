import Web3 from "web3";
import { ApolloClient, InMemoryCache } from "@apollo/client";

import blob_contracts from "./blob_contracts.json";
import { subgraph_url } from "./subgraph_config.json";
import BLOBLeagueContract from "./contracts/contracts/BLOBLeague.sol/BLOBLeague.json";
import BLOBTeamContract from "./contracts/contracts/BLOBTeam.sol/BLOBTeam.json";
import BLOBPlayerContract from "./contracts/contracts/BLOBPlayer.sol/BLOBPlayer.json";
import BLOBSeasonContract from "./contracts/contracts/BLOBSeason.sol/BLOBSeason.json";
import BLOBMatchContract from "./contracts/contracts/BLOBMatch.sol/BLOBMatch.json";
import BLOBUtilsContract from "./contracts/contracts/BLOBUtils.sol/BLOBUtils.json";

const getWeb3 = () =>
  new Promise((resolve, reject) => {
    // Modern dapp browsers...
    if (window.ethereum) {
      const web3 = new Web3(Web3.givenProvider);
      // Request account access if needed
      window.ethereum
        .request({ method: "eth_requestAccounts" })
        .then(() => window.ethereum.request({ method: "eth_accounts" }))
        .then((accounts) => resolve([web3, accounts]))
        .catch((e) => reject(e));
    }
    // Legacy dapp browsers...
    else if (window.web3) {
      // Use Mist/MetaMask's provider.
      const web3 = window.web3;
      console.log("Injected web3 detected.");
      resolve([web3, web3.eth.accounts]);
    }
    // Fallback to localhost; use dev console port by default...
    else {
      console.log("No web3 instance injected!");
      reject();
    }
  });

const getContractsAndAccount = async () => {
  try {
    const [web3, accounts] = await getWeb3();

    const leagueContract = new web3.eth.Contract(
      BLOBLeagueContract.abi,
      blob_contracts.BLOBLeague
    );

    const teamContract = new web3.eth.Contract(
      BLOBTeamContract.abi,
      blob_contracts.BLOBTeam
    );

    const playerContract = new web3.eth.Contract(
      BLOBPlayerContract.abi,
      blob_contracts.BLOBPlayer
    );

    const seasonContract = new web3.eth.Contract(
      BLOBSeasonContract.abi,
      blob_contracts.BLOBSeason
    );

    const matchContract = new web3.eth.Contract(
      BLOBMatchContract.abi,
      blob_contracts.BLOBMatch
    );

    const utilsContract = new web3.eth.Contract(
      BLOBUtilsContract.abi,
      blob_contracts.BLOBUtils
    );
    return {
      LeagueContract: leagueContract,
      TeamContract: teamContract,
      PlayerContract: playerContract,
      SeasonContract: seasonContract,
      MatchContract: matchContract,
      UtilsContract: utilsContract,
      Account: accounts[0],
    };
  } catch (error) {
    // Catch any errors for any of the above operations.
    alert(
      `Failed to load web3, accounts, or contracts. Check console for details.`
    );
  }
};

const parseErrorCode = async (utilsContract, errCodeStr) => {
  const regex = /'(\d+)'/i;
  const found = errCodeStr.match(regex);
  if (found !== null)
    return utilsContract.methods.errorCodeDescription(found[1]).call();
  else return errCodeStr;
};

const getSubgraphClient = () =>
  new ApolloClient({
    uri: subgraph_url,
    cache: new InMemoryCache(),
  });

export { getContractsAndAccount, parseErrorCode, getSubgraphClient };
