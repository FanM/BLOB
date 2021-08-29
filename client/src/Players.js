import React, { useState, useEffect } from "react";
import { makeStyles } from "@material-ui/core/styles";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import Container from "@material-ui/core/Container";

import PlayerDetail from "./PlayerDetail";
import { parseErrorCode } from "./utils";

const useStyles = makeStyles((theme) => ({
  root: {
    margin: theme.spacing(2),
    maxWidth: "xs",
  },
}));

const Players = ({ teamId, showMessage, blobContracts }) => {
  const classes = useStyles();
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    blobContracts.TeamContract.methods
      .GetTeamRosterIds(teamId)
      .call()
      .then((playerIds) =>
        Promise.all(
          playerIds
            .sort((a, b) => a - b)
            .map((id) =>
              blobContracts.PlayerContract.methods.GetPlayer(id).call()
            )
        ).then((players) => setPlayers(players))
      )
      .catch((e) =>
        parseErrorCode(blobContracts.UtilsContract, e.message).then((s) =>
          showMessage(s, true)
        )
      );
  }, [teamId, showMessage, blobContracts]);

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
