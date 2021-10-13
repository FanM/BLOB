import Web3 from "web3";
import { ApolloClient, InMemoryCache } from "@apollo/client";
import WalletConnectProvider from "@walletconnect/web3-provider";

import blob_contracts from "./blob_contracts.json";
import { subgraph_url } from "./env.json";
import { walletConnectSites } from "./env.json";
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
        rpc: walletConnectSites,
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
        Web3: web3,
      };
    })
    .catch((error) => {
      // Catch any errors for any of the above operations.
      console.log(error);
      throw new Error(
        "Failed to load web3, accounts, or contracts. Do you have MetaMask installed?"
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

const timestampToDate = (t) => {
  const date = new Date(t * 1000);
  return date.toLocaleString();
};

const MAX_PLAYER_SHOT_ALLOC_PCT = 25;
const MINUTES_IN_MATCH = 48;
const MIN_PLAYERS_ON_ROSTER = 8;
const MAX_PLAYERS_ON_ROSTER = 12;
const localValidatePlayerGameTime = (
  players,
  playerGameTimes,
  matchRound,
  team3PShotAllocInput,
  errorDesc
) => {
  const team3PShotAlloc = parseInt(team3PShotAllocInput);
  if (isNaN(team3PShotAlloc))
    return {
      playerIndex: null,
      position: null,
      errorMsg: errorDesc.TEAM_INVALID_3P_NUMERIC_INPUT,
    };
  let playableRosterCount = 0;
  let totalShotAllocation = 0;
  let totalShot3PointAllocation = 0;
  let positionMinutes = [0, 0, 0, 0, 0];
  let positionStarter = [false, false, false, false, false];
  for (let i = 0; i < players.length; i++) {
    const player = players[i];
    const gameTime = playerGameTimes[i];
    let playTime = parseInt(gameTime.playTime);
    let shotAllocation = parseInt(gameTime.shotAllocation);
    let shot3PAllocation = parseInt(gameTime.shot3PAllocation);
    if (isNaN(shotAllocation))
      return {
        playerIndex: i,
        position: null,
        errorMsg: errorDesc.PLAYER_INVALID_SHOT_NUMERIC_INPUT,
      };
    if (isNaN(shot3PAllocation))
      return {
        playerIndex: i,
        position: null,
        errorMsg: errorDesc.PLAYER_INVALID_3P_SHOT_NUMERIC_INPUT,
      };
    if (isNaN(playTime))
      return {
        playerIndex: i,
        position: null,
        errorMsg: errorDesc.PLAYER_INVALID_MIN_NUMERIC_INPUT,
      };
    // 1. player must be eligible for playing, not injured or retired
    if (!player.retired && matchRound >= player.nextAvailableRound) {
      if (playTime > 0) {
        playableRosterCount++;
        positionMinutes[player.position] += playTime;

        if (gameTime.starter) {
          if (!positionStarter[player.position])
            positionStarter[player.position] = true;
          // 2. each position can have only one starter
          else
            return {
              playerIndex: i,
              position: null,
              errorMsg: errorDesc.TEAM_REDUNDANT_STARTERS,
            };
        }

        // 3. shot allocation per player must be less than
        //    MAX_PLAYER_SHOT_ALLOC_PCT
        const personalShotAlloc =
          (shotAllocation * (100 - team3PShotAlloc)) / 100 +
          (shot3PAllocation * team3PShotAlloc) / 100;
        if (personalShotAlloc > MAX_PLAYER_SHOT_ALLOC_PCT)
          return {
            playerIndex: i,
            position: null,
            errorMsg: errorDesc.PLAYER_EXCEED_SHOT_ALLOC,
          };

        // 4. shot allocation percentage per player must be less than
        //    1/3 of their play time percentage
        //    i.e. if a player has 25% shot allocation, he must play
        //    at least 75% of minutes, in line with real games
        if (3 * personalShotAlloc > (playTime * 100) / MINUTES_IN_MATCH)
          return {
            playerIndex: i,
            position: null,
            errorMsg: errorDesc.PLAYER_EXCEED_TIME_ALLOC,
          };
        totalShotAllocation += shotAllocation;
        totalShot3PointAllocation += shot3PAllocation;
      }
    }
  }
  // 5. number of players per team must be within
  // [MIN_PLAYERS_ON_ROSTER, MAX_PLAYERS_ON_ROSTER]
  if (playableRosterCount < MIN_PLAYERS_ON_ROSTER)
    return {
      playerIndex: null,
      position: null,
      errorMsg: errorDesc.TEAM_LESS_THAN_MIN_ROSTER,
    };
  if (playableRosterCount > MAX_PLAYERS_ON_ROSTER)
    return {
      playerIndex: null,
      position: null,
      errorMsg: errorDesc.TEAM_MORE_THAN_MAX_ROSTER,
    };

  // 6. players of the same position must have play time add up to 48 minutes,
  for (let i = 0; i < 5; i++) {
    if (positionMinutes[i] !== MINUTES_IN_MATCH)
      return {
        playerIndex: null,
        position: i,
        errorMsg: errorDesc.TEAM_POS_TIME_ALLOC_INVALID,
      };
    // 7. all starters must be playable
    if (!positionStarter[i])
      return {
        playerIndex: null,
        position: i,
        errorMsg: errorDesc.TEAM_NOT_ENOUGH_STARTERS,
      };
  }
  // 8. total shot & shot3Point allocations must account for 100%
  if (totalShotAllocation !== 100)
    return {
      playerIndex: null,
      position: null,
      errorMsg: errorDesc.TEAM_INSUFFICIENT_2P_SHOT_ALLOC,
    };
  if (totalShot3PointAllocation !== 100)
    return {
      playerIndex: null,
      position: null,
      errorMsg: errorDesc.TEAM_INSUFFICIENT_3P_SHOT_ALLOC,
    };
  return {
    playerIndex: null,
    position: null,
    errorMsg: "",
  };
};

export {
  initContractsAndAccount,
  parseErrorCode,
  getSubgraphClient,
  timestampToDate,
  localValidatePlayerGameTime,
  MINUTES_IN_MATCH,
  MAX_PLAYER_SHOT_ALLOC_PCT,
};
