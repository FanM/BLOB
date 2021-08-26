import React, { useState, useEffect, useRef } from "react";
import { makeStyles } from "@material-ui/core/styles";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import Container from "@material-ui/core/Container";

import PlayerDetail from "./PlayerDetail";
import { getContractsAndAccount, parseErrorCode } from "./utils";

const useStyles = makeStyles((theme) => ({
  root: {
    margin: theme.spacing(2),
    maxWidth: "xs",
  },
}));

const Players = ({ teamId, showMessage }) => {
  const classes = useStyles();
  const teamContract = useRef(undefined);
  const playerContract = useRef(undefined);
  const seasonContract = useRef(undefined);
  const utilsContract = useRef(undefined);
  const currentUser = useRef(undefined);
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    const updatePlayers = () => {
      teamContract.current.methods
        .GetTeamRosterIds(teamId)
        .call()
        .then((playerIds) =>
          Promise.all(
            playerIds
              .sort((a, b) => a - b)
              .map((id) => playerContract.current.methods.GetPlayer(id).call())
          ).then((players) => setPlayers(players))
        )
        .catch((e) =>
          parseErrorCode(utilsContract.current, e.message).then((s) =>
            showMessage(s, true)
          )
        );
    };

    const init = async () => {
      window.ethereum.on("accountsChanged", (accounts) => {
        currentUser.current = accounts[0];
        updatePlayers();
      });

      // Get contracts instance.
      const contractsAndAccount = await getContractsAndAccount();
      teamContract.current = contractsAndAccount.TeamContract;
      playerContract.current = contractsAndAccount.PlayerContract;
      seasonContract.current = contractsAndAccount.SeasonContract;
      utilsContract.current = contractsAndAccount.UtilsContract;
      currentUser.current = contractsAndAccount.Account;
      await updatePlayers();
    };
    init();
  }, [teamId, showMessage]);

  return (
    <div>
      <Container className={classes.root}>
        <List>
          {players.map((player, index) => (
            <ListItem key={index}>
              <PlayerDetail player={player} />
            </ListItem>
          ))}
        </List>
      </Container>
    </div>
  );
};

export default Players;
