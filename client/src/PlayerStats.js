import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { ApolloClient, InMemoryCache, gql } from '@apollo/client';

import { withStyles } from "@material-ui/core/styles";
import Card from "@material-ui/core/Card";
import CardHeader from "@material-ui/core/CardHeader";
import CardContent from "@material-ui/core/CardContent";
import Avatar from "@material-ui/core/Avatar";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableContainer from "@material-ui/core/TableContainer";
import TableCell from "@material-ui/core/TableCell";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import Paper from "@material-ui/core/Paper";
import Grid from "@material-ui/core/Grid";
import FaceIcon from "@material-ui/icons/Face";

const styles = (theme) => ({
  root: {
    margin: theme.spacing(1),
    overflow: "auto",
  },
  card: {
    minWidth: 400,
  },
});

const GRAPH_API_URL = "http://127.0.0.1:8000/subgraphs/name/FanM/eth_blob_subgraph";

const PlayerStatsTable = ({ classes, playerStats }) => {
  return (
    <TableContainer component={Paper} className={classes.root}>
      <Table>
        <TableHead>
          <TableRow align="right">
            <TableCell align="right">Match</TableCell>
            <TableCell align="right">MIN</TableCell>
            <TableCell align="right">FGM</TableCell>
            <TableCell align="right">FGA</TableCell>
            <TableCell align="right">TPM</TableCell>
            <TableCell align="right">TPA</TableCell>
            <TableCell align="right">FTM</TableCell>
            <TableCell align="right">FTA</TableCell>
            <TableCell align="right">PTS</TableCell>
            <TableCell align="right">AST</TableCell>
            <TableCell align="right">REB</TableCell>
            <TableCell align="right">BLK</TableCell>
            <TableCell align="right">STL</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {playerStats.map((stat, index) => (
          <TableRow key={index}>
            <TableCell align="right">{stat.matchId}</TableCell>
            <TableCell align="right">{stat.min}</TableCell>
            <TableCell align="right">{stat.fgm}</TableCell>
            <TableCell align="right">{stat.fga}</TableCell>
            <TableCell align="right">{stat.tpm}</TableCell>
            <TableCell align="right">{stat.tpa}</TableCell>
            <TableCell align="right">{stat.ftm}</TableCell>
            <TableCell align="right">{stat.fta}</TableCell>
            <TableCell align="right">{stat.pts}</TableCell>
            <TableCell align="right">{stat.ast}</TableCell>
            <TableCell align="right">{stat.reb}</TableCell>
            <TableCell align="right">{stat.blk}</TableCell>
            <TableCell align="right">{stat.stl}</TableCell>
          </TableRow>
        ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

const PlayerStats = withStyles(styles)(({ classes, setTitle, showMessage }) => {
  let { playerId } = useParams();
  const [playerStats, setPlayerStats] = useState([]);

  useEffect(() => {
    const tokensQuery = `
      query {
        playerGameStats(first: 10, orderBy: matchId, where: { playerId: ${playerId}}){
          seasonId,
          matchId,
          playerId,
          overtime,
          min,
          fgm,
          fga,
          tpm,
          tpa,
          ftm,
          fta,
          pts,
          ast,
          reb,
          blk,
          stl
        }
      }`;

    const graph_client = new ApolloClient({
      uri: GRAPH_API_URL ,
      cache: new InMemoryCache()
    });

    setTitle("Player Stats #" + playerId);

    graph_client.query({
      query: gql(tokensQuery)
    })
    .then(data => setPlayerStats(data.data.playerGameStats))
    .catch(err => { showMessage(err.message, true) });

  }, [setTitle, showMessage, playerId]);

  return (
    <Card elevation={3} className={classes.card}>
      <CardHeader
        title={`#${playerId}`}
        avatar={
          <Avatar>
            <FaceIcon />
          </Avatar>
        }
      />
      <CardContent>
        <Grid container justifyContent="center">
          <PlayerStatsTable classes={classes} playerStats={playerStats} />
        </Grid>
      </CardContent>
    </Card>
  );
});

export default PlayerStats;
