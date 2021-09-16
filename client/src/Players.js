import React, { useState, useEffect } from "react";
import { gql } from "@apollo/client";
import { makeStyles } from "@material-ui/core/styles";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";

import { PlayerCard } from "./PlayerCard";

const useStyles = makeStyles((theme) => ({
  root: {
    margin: theme.spacing(-2),
    padding: theme.spacing(-1),
  },
}));

const Players = ({ teamId, showMessage, blobContracts, graph_client }) => {
  const classes = useStyles();
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    const getPlayerList = () => {
      const playerListQuery = `
        query {
          players(orderBy: playerId, where: {team: "${teamId}"}){
            playerId,
            position,
            age,
            physicalStrength,
            maturity,
            shot,
            shot3Point,
            assist,
            rebound,
            blockage,
            steal,
            freeThrow
          }
        }
      `;
      return graph_client
        .query({
          query: gql(playerListQuery),
        })
        .then((data) => data.data.players)
        .catch((e) => showMessage(e.message, true));
    };
    if (graph_client !== null)
      getPlayerList().then((players) => setPlayers(players));
  }, [teamId, showMessage, graph_client]);

  return (
    <div className={classes.root}>
      <List>
        {players.map((player, index) => (
          <ListItem key={index}>
            <PlayerCard player={player} />
          </ListItem>
        ))}
      </List>
    </div>
  );
};

export default Players;
