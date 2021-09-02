import Web3 from "web3";
import { ApolloClient, InMemoryCache } from "@apollo/client";
import WalletConnectProvider from "@walletconnect/web3-provider";

import blob_contracts from "./blob_contracts.json";
import { subgraph_url } from "./env.json";
import { wallectConnectSites } from "./env.json";
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
      const web3 = new Web3(window.ethereum);
      // Request account access if needed
      window.ethereum
        .request({ method: "eth_requestAccounts" })
        .then(() => window.ethereum.request({ method: "eth_accounts" }))
        .then((accounts) => resolve([web3, accounts, window.ethereum]))
        .catch((e) => reject(e));
    }
    // WalletConnect
    else {
      const provider = new WalletConnectProvider({
        rpc: wallectConnectSites,
      });
      provider
        .enable()
        .then(() => {
          const web3 = new Web3(provider);
          return web3.eth
            .getAccounts()
            .then((accounts) => resolve([web3, accounts, provider]));
        })
        .catch((e) =>
          reject(`Failed to connect to WalletConnect: ${e.message}`)
        );
    }
  });

const initContractsAndAccount = () =>
  getWeb3()
    .then(([web3, accounts, provider]) => {
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
        Provider: provider,
      };
    })
    .catch((error) => {
      // Catch any errors for any of the above operations.
      console.log(error);
      throw new Error(
        "Failed to load web3, accounts, or contracts. Do you have MetaMask installed?" +
          ` Detail Error: ${error}`
      );
    });

const parseErrorCode = (utilsContract, errCodeStr) => {
  const result = Promise.resolve(errCodeStr);
  const regex = /'(\d{1,2})'/i;
  const found = errCodeStr.match(regex);
  if (found !== null)
    return utilsContract.methods.errorCodeDescription(found[1]).call();
  return result;
};

const getSubgraphClient = () =>
  new ApolloClient({
    uri: subgraph_url,
    cache: new InMemoryCache(),
  });

export { initContractsAndAccount, parseErrorCode, getSubgraphClient };
