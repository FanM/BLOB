import React, { useState, useEffect } from "react";
import { gql } from "@apollo/client";
import { makeStyles } from "@material-ui/core/styles";
import Grid from "@material-ui/core/Grid";

import { PlayerCard } from "./PlayerCard";

const useStyles = makeStyles((theme) => ({
  root: {
    margin: theme.spacing(-1),
    padding: theme.spacing(0),
  },
}));

const Players = ({ teamId, showMessage, graph_client }) => {
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
        .then((data) => data.data.players);
    };
    if (graph_client !== null)
      getPlayerList()
        .then((players) => {
          if (players) setPlayers(players);
          else showMessage("Network Error", true);
        })
        .catch((e) => showMessage(e.message, true));
  }, [teamId, showMessage, graph_client]);

  return (
    <div className={classes.root}>
      <Grid container>
        {players.map((player, index) => (
          <Grid key={index} item xs={12} md={6}>
            <PlayerCard player={player} />
          </Grid>
        ))}
      </Grid>
    </div>
  );
};

export default Players;
