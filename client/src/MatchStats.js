import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { gql } from "@apollo/client";

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
import Typography from "@material-ui/core/Grid";
import StatsIcon from "@material-ui/icons/BarChart";

import { timestampToDate } from "./utils";

const styles = (theme) => ({
  root: {
    display: "flex",
    justifyContent: "center",
  },
  table: {
    margin: theme.spacing(0),
    overflow: "auto",
    maxHeight: 260,
  },
  card: {
    flexGrow: 1,
    margin: theme.spacing(1),
  },
  title: {
    margin: theme.spacing(2),
    padding: theme.spacing(1),
    color: theme.palette.text.secondary,
  },
});

const PlayerStatsTable = ({ classes, playerStats }) => {
  return (
    <TableContainer component={Paper} className={classes.table}>
      <Table stickyHeader>
        <TableHead>
          <TableRow align="right">
            <TableCell align="right">#</TableCell>
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
              <TableCell align="right">
                <strong>{stat.playerId}</strong>
              </TableCell>
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

const MatchStats = withStyles(styles)(
  ({ classes, setTitle, showMessage, graph_client }) => {
    let { seasonId, matchId } = useParams();
    const [matchInfo, setMatchInfo] = useState({});
    const [hostPlayerStats, setHostPlayerStats] = useState([]);
    const [guestPlayerStats, setGuestPlayerStats] = useState([]);

    useEffect(() => {
      const getMatchInfo = (seasonId, matchId) => {
        const matchInfoQuery = `
          query {
            gameStats(where: { seasonId: ${seasonId},
                               matchId: ${matchId}}){
                timestamp,
                seasonId,
                matchId,
                hostTeam,
                guestTeam,
                hostScore,
                guestScore,
                overtimeCount,
                hostForfeit,
                guestForfeit
              }
            }
        `;
        return graph_client
          .query({
            query: gql(matchInfoQuery),
          })
          .then((data) => data.data.gameStats[0]);
      };

      const getTeamMatchStats = (seasonId, matchId, teamId) => {
        const matchStatsQuery = `
          query {
            playerGameStats(orderBy: playerId,
                            where: { seasonId: ${seasonId},
                                     matchId: ${matchId},
                                     teamId: ${teamId}}){
              seasonId,
              matchId,
              playerId,
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
          }
        `;
        return graph_client
          .query({
            query: gql(matchStatsQuery),
          })
          .then((data) => data.data.playerGameStats);
      };
      setTitle("Game Stats");
      if (graph_client !== null)
        getMatchInfo(seasonId, matchId)
          .then((match) => {
            setMatchInfo(match);
            getTeamMatchStats(seasonId, matchId, match.hostTeam).then((stats) =>
              setHostPlayerStats(stats)
            );
            getTeamMatchStats(seasonId, matchId, match.guestTeam).then(
              (stats) => setGuestPlayerStats(stats)
            );
          })
          .catch((err) => {
            showMessage(err.message, true);
          });
    }, [setTitle, showMessage, graph_client, seasonId, matchId]);

    return (
      <Grid container className={classes.root}>
        <Card elevation={3} style={{ width: 340 }} className={classes.card}>
          <CardHeader
            title={`GAME ${matchId}`}
            subheader={`${timestampToDate(matchInfo.timestamp)}`}
            avatar={
              <Avatar>
                <StatsIcon />
              </Avatar>
            }
          />
          <CardContent>
            <Grid container justifyContent="center">
              <Grid item xs={12}>
                <Typography className={classes.title}>
                  Host Team {matchInfo.hostTeam} :{" "}
                  <strong>
                    {matchInfo.hostForfeit ? "F" : matchInfo.hostScore}
                  </strong>
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <PlayerStatsTable
                  classes={classes}
                  playerStats={hostPlayerStats}
                />
              </Grid>
              <Grid item xs={12}>
                <Typography className={classes.title}>
                  Guest Team {matchInfo.guestTeam} :{" "}
                  <strong>
                    {matchInfo.guestForfeit ? "F" : matchInfo.guestScore}
                  </strong>
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <PlayerStatsTable
                  classes={classes}
                  playerStats={guestPlayerStats}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    );
  }
);

export default MatchStats;
