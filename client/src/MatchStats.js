import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { ApolloClient, InMemoryCache, gql } from "@apollo/client";

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
import StatsIcon from "@material-ui/icons/BarChart";

const styles = (theme) => ({
  root: {
    margin: theme.spacing(1),
    overflow: "auto",
  },
  card: {
    minWidth: 400,
  },
});

const GRAPH_API_URL =
  "http://127.0.0.1:8000/subgraphs/name/FanM/eth_blob_subgraph";

const PlayerStatsTable = ({ classes, playerStats }) => {
  return (
    <TableContainer component={Paper} className={classes.root}>
      <Table>
        <TableHead>
          <TableRow align="right">
            <TableCell align="right">PLAYER</TableCell>
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
              <TableCell align="right">{stat.playerId}</TableCell>
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

const MatchStats = withStyles(styles)(({ classes, setTitle, showMessage }) => {
  let { seasonId, matchId } = useParams();
  const graph_client = useRef(undefined);
  const [hostPlayerStats, setHostPlayerStats] = useState([]);
  //const [guestPlayerStats, setGuestPlayerStats] = useState([]);

  const getTeamMatchStats = useCallback((matchId, seasonId) => {
    const tokensQuery = `
      query {
        playerGameStats(first: 10,
                        orderBy: playerId,
                        where: { seasonId: ${seasonId},
                                 matchId: ${matchId}}){
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
    return graph_client.current
      .query({
        query: gql(tokensQuery),
      })
      .then((data) => data.data.playerGameStats);
  }, []);

  useEffect(() => {
    graph_client.current = new ApolloClient({
      uri: GRAPH_API_URL,
      cache: new InMemoryCache(),
    });

    setTitle("Match Stats");
    getTeamMatchStats()
      .then((stats) => setHostPlayerStats(stats))
      .catch((err) => {
        showMessage(err.message, true);
      });
  }, [setTitle, showMessage, getTeamMatchStats]);

  return (
    <Card elevation={3} className={classes.card}>
      <CardHeader
        title={`#${matchId}`}
        subheader={`SEASON ${seasonId}`}
        avatar={
          <Avatar>
            <StatsIcon />
          </Avatar>
        }
      />
      <CardContent>
        <Grid container justifyContent="center">
          <PlayerStatsTable classes={classes} playerStats={hostPlayerStats} />
        </Grid>
      </CardContent>
    </Card>
  );
});

export default MatchStats;
