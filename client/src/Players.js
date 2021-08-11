import React, { useState, useEffect, useRef } from "react";
import { makeStyles } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import Grid from "@material-ui/core/Grid";
import Chip from "@material-ui/core/Chip";
import Typography from "@material-ui/core/Typography";

import { getContractsAndAccount, parseErrorCode } from "./utils";

const useStyles = makeStyles((theme) => ({
  container: {
    display: "flex",
    flexWrap: "wrap",
  },
  button: {
    margin: theme.spacing(1),
  },
  paper: {
    padding: theme.spacing(2),
    textAlign: "center",
    color: theme.palette.text.secondary,
  },
}));

const Players = (props) => {
  const classes = useStyles();
  const teamContract = useRef(undefined);
  const playerContract = useRef(undefined);
  const utilsContract = useRef(undefined);
  const currentUser = useRef(undefined);
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    const init = async () => {
      window.ethereum.on("accountsChanged", (accounts) => {
        currentUser.current = accounts[0];
        updatePlayers();
      });

      // Get contracts instance.
      const contractsAndAccount = await getContractsAndAccount();
      teamContract.current = contractsAndAccount.TeamContract;
      playerContract.current = contractsAndAccount.PlayerContract;
      utilsContract.current = contractsAndAccount.UtilsContract;
      currentUser.current = contractsAndAccount.Account;
      await updatePlayers();
    };
    init();
  }, []);

  const updatePlayers = async () => {
    try {
      const teamId = await teamContract.current.methods
        .MyTeamId()
        .call({ from: currentUser.current });
      const players = await teamContract.current.methods
        .GetTeamRosterIds(teamId)
        .call();
      const decoratedPlayers = await Promise.all(
        players.map(async (playerId) => {
          return await playerContract.current.methods
            .GetPlayer(playerId)
            .call();
        })
      );
      setPlayers(decoratedPlayers);
    } catch (e) {
      alert(await parseErrorCode(utilsContract.current, e.message));
    }
  };

  const displayPlayers = () => {
    return players.map((player) => {
      return (
        <Grid item xs={12} key={player.id}>
          <Paper className={classes.paper}>
            <Chip label={player.id} />
            <Typography>
              <strong>{player.name} </strong> Position: {player.position} Age:{" "}
              {player.age}
            </Typography>
          </Paper>
        </Grid>
      );
    });
  };

  return (
    <div className="main-container">
      <div className="match-schedules-container">
        <Grid container justifyContent="space-around" spacing={4}>
          {displayPlayers()}
        </Grid>
      </div>
    </div>
  );
};

export default Players;
