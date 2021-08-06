import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import AppBar from "@material-ui/core/AppBar";
import Toolbar from "@material-ui/core/Toolbar";
import Typography from "@material-ui/core/Typography";
import { BrowserRouter as Router, Route, NavLink } from "react-router-dom";

import Schedules from "./Schedules";
import Teams from "./Teams";
import Standings from "./Standings";

import getWeb3 from "./utils";
import blob_contracts from "./blob_contracts.json";
import BLOBLeagueContract from "./contracts/contracts/BLOBLeague.sol/BLOBLeague.json";
import BLOBTeamContract from "./contracts/contracts/BLOBTeam.sol/BLOBTeam.json";
import BLOBSeasonContract from "./contracts/contracts/BLOBSeason.sol/BLOBSeason.json";
import BLOBUtilsContract from "./contracts/contracts/BLOBUtils.sol/BLOBUtils.json";

import "./App.css";

const App = () => {
  const contractsAndAccount = React.useRef(undefined);

  makeStyles({
    root: {
      flexGrow: 1,
    },
  });

  const getContracts = async () => {
    if (contractsAndAccount.current === undefined) {
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

        const seasonContract = new web3.eth.Contract(
          BLOBSeasonContract.abi,
          blob_contracts.BLOBSeason
        );

        const utilsContract = new web3.eth.Contract(
          BLOBUtilsContract.abi,
          blob_contracts.BLOBUtils
        );
        contractsAndAccount.current = {
          LeagueContract: leagueContract,
          TeamContract: teamContract,
          SeasonContract: seasonContract,
          UtilsContract: utilsContract,
          Account: accounts[0],
        };
      } catch (error) {
        // Catch any errors for any of the above operations.
        alert(
          `Failed to load web3, accounts, or contract. Check console for details.`
        );
        console.error(error);
      }
    }
    return contractsAndAccount.current;
  };

  const parseErrorCode = async (errCodeStr) => {
    const regex = /'(\d+)'/i;
    const found = errCodeStr.match(regex);
    return await getContracts().then((c) =>
      c.UtilsContract.methods.errorCodeDescription(found[1]).call()
    );
  };

  return (
    <div>
      <Router>
        <AppBar position="static" color="default" style={{ margin: 0 }}>
          <Toolbar>
            <Typography variant="h6" color="inherit">
              <NavLink className="nav-link" to="/">
                Home
              </NavLink>
            </Typography>
            <NavLink className="nav-link" to="/teams">
              Teams
            </NavLink>
            <NavLink className="nav-link" to="/standings/">
              Standings
            </NavLink>
          </Toolbar>
        </AppBar>

        <Route path="/">
          <Schedules
            getContracts={getContracts}
            parseErrorCode={parseErrorCode}
          />
        </Route>
        <Route path="/teams">
          <Teams getContracts={getContracts} parseErrorCode={parseErrorCode} />
        </Route>
        <Route path="/standings">
          <Standings
            getContracts={getContracts}
            parseErrorCode={parseErrorCode}
          />
        </Route>
      </Router>
    </div>
  );
};

export default App;
