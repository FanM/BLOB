import React, { useEffect, useState } from "react";
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
import Button from "@material-ui/core/Button";
import Typography from "@material-ui/core/Typography";
import FaceIcon from "@material-ui/icons/Face";

import { POSITIONS } from "./PlayerCard";
const styles = (theme) => ({
  table: {
    margin: theme.spacing(0),
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(1),
    overflow: "auto",
  },
  card: {
    flexGrow: 1,
    marginLeft: theme.spacing(0),
    padding: theme.spacing(-1),
    opacity: 0.99,
  },
  text: {
    margin: theme.spacing(1),
    color: theme.palette.text.secondary,
  },
  cell: {
    margin: theme.spacing(0),
    padding: theme.spacing(0),
  },
  gameLink: {
    margin: theme.spacing(-1),
    padding: theme.spacing(0),
  },
});

const PlayerProfileTable = ({ classes, player }) => {
  return (
    <TableContainer component={Paper} className={classes.table}>
      <Table>
        <TableHead>
          <TableRow align="right">
            <TableCell align="right">2PT</TableCell>
            <TableCell align="right">3PT</TableCell>
            <TableCell align="right">AST</TableCell>
            <TableCell align="right">REB</TableCell>
            <TableCell align="right">BLK</TableCell>
            <TableCell align="right">STL</TableCell>
            <TableCell align="right">FT</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow key={0}>
            <TableCell align="right">{player.shot}</TableCell>
            <TableCell align="right">{player.shot3Point}</TableCell>
            <TableCell align="right">{player.assist}</TableCell>
            <TableCell align="right">{player.rebound}</TableCell>
            <TableCell align="right">{player.blockage}</TableCell>
            <TableCell align="right">{player.steal}</TableCell>
            <TableCell align="right">{player.freeThrow}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  );
};

const PlayerStatsTable = ({ classes, seasonId, lastGames }) => {
  return (
    <TableContainer component={Paper} className={classes.table}>
      <Table>
        <TableHead>
          <TableRow align="right">
            <TableCell align="center">G</TableCell>
            <TableCell align="right">MIN</TableCell>
            <TableCell align="right">PTS</TableCell>
            <TableCell align="right">FGM</TableCell>
            <TableCell align="right">FGA</TableCell>
            <TableCell align="right">TPM</TableCell>
            <TableCell align="right">TPA</TableCell>
            <TableCell align="right">FTM</TableCell>
            <TableCell align="right">FTA</TableCell>
            <TableCell align="right">AST</TableCell>
            <TableCell align="right">REB</TableCell>
            <TableCell align="right">BLK</TableCell>
            <TableCell align="right">STL</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {lastGames.map((stat, index) => (
            <TableRow key={index}>
              <TableCell align="center" className={classes.cell}>
                <Button
                  href={`../match/${seasonId}/${stat.matchId}`}
                  color="primary"
                  className={classes.gameLink}
                >
                  {stat.matchId}
                </Button>
              </TableCell>
              <TableCell align="right">{stat.min}</TableCell>
              <TableCell align="right">{stat.pts}</TableCell>
              <TableCell align="right">{stat.fgm}</TableCell>
              <TableCell align="right">{stat.fga}</TableCell>
              <TableCell align="right">{stat.tpm}</TableCell>
              <TableCell align="right">{stat.tpa}</TableCell>
              <TableCell align="right">{stat.ftm}</TableCell>
              <TableCell align="right">{stat.fta}</TableCell>
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

const PlayerProfile = withStyles(styles)(
  ({ classes, seasonId, setTitle, showMessage, graph_client }) => {
    let { playerId } = useParams();
    let [player, setPlayer] = useState({
      team: { name: "" },
    });
    let [lastGames, setLastGames] = useState([]);

    useEffect(() => {
      const getPlayer = () => {
        const playerQuery = `
          query {
            players(where: {playerId: ${playerId}}, first: 1){
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
              freeThrow,
              retired,
              team {
                teamId,
                name
              }
            }
          }
        `;
        return graph_client
          .query({
            query: gql(playerQuery),
          })
          .then((data) => data.data.players[0])
          .catch((e) => showMessage(e.message, true));
      };
      const getPlayerLastGames = () => {
        const playerGameQuery = `
        query {
          playerGameStats(orderBy: matchId, orderDirection: desc
            where: { player: "${playerId}", seasonId: ${seasonId}}, first: 5) {
              matchId,
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
            query: gql(playerGameQuery),
          })
          .then((data) => data.data.playerGameStats)
          .catch((e) => showMessage(e.message, true));
      };
      setTitle("Player Profile");
      if (graph_client !== null && seasonId !== null) {
        getPlayer().then((player) => setPlayer(player));
        getPlayerLastGames().then((lastGames) => setLastGames(lastGames));
      }
    }, [playerId, seasonId, setTitle, showMessage, graph_client]);

    return (
      <Grid container justifyContent="center">
        <Card elevation={3} style={{ width: 325 }} className={classes.card}>
          <CardHeader
            title={`#${player.playerId}`}
            subheader={POSITIONS[player.position]}
            avatar={
              <Avatar>
                <FaceIcon />
              </Avatar>
            }
          />
          <CardContent>
            <Grid container justifyContent="center">
              <Grid item xs={12}>
                <Typography className={classes.text}>
                  Current Team: <strong>{player.team.name}</strong>
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography className={classes.text}>
                  Age: <strong>{player.age}</strong>
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography className={classes.text}>
                  Retired: <strong>{player.retired ? "Yes" : "No"}</strong>
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography className={classes.text}>
                  Fitness: <strong>{player.physicalStrength}</strong>
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography className={classes.text}>
                  Maturity: <strong>{player.maturity}</strong>
                </Typography>
              </Grid>
              <PlayerProfileTable classes={classes} player={player} />
              <Grid item xs={12}>
                <Typography className={classes.text}>Latest Games</Typography>
              </Grid>
              <PlayerStatsTable
                classes={classes}
                seasonId={seasonId}
                lastGames={lastGames}
              />
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    );
  }
);

export default PlayerProfile;
