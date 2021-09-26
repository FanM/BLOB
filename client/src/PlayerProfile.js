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
  teamLink: {
    margin: theme.spacing(-1),
    paddingBottom: theme.spacing(1),
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
          <TableRow>
            <TableCell align="center">2PT</TableCell>
            <TableCell align="center">3PT</TableCell>
            <TableCell align="center">AST</TableCell>
            <TableCell align="center">REB</TableCell>
            <TableCell align="center">BLK</TableCell>
            <TableCell align="center">STL</TableCell>
            <TableCell align="center">FT</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow key={0}>
            <TableCell align="center">
              <strong>{player.shot}</strong>
            </TableCell>
            <TableCell align="center">
              <strong>{player.shot3Point}</strong>
            </TableCell>
            <TableCell align="center">
              <strong>{player.assist}</strong>
            </TableCell>
            <TableCell align="center">
              <strong>{player.rebound}</strong>
            </TableCell>
            <TableCell align="center">
              <strong>{player.blockage}</strong>
            </TableCell>
            <TableCell align="center">
              <strong>{player.steal}</strong>
            </TableCell>
            <TableCell align="center">
              <strong>{player.freeThrow}</strong>
            </TableCell>
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
                  href={`../match/${seasonId}/${stat.game.gameId}`}
                  color="primary"
                  className={classes.gameLink}
                >
                  {stat.game.gameId}
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
      debutSeason: { seasonId: "" },
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
              debutSeason {
                seasonId
              },
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
              },
              nextAvailableRound,
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
          playerGameStats(where: { player: "${playerId}",
                                   season: "${seasonId}"},
                                   first: 5) {
              game {
                gameId,
              },
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
      if (graph_client !== null && seasonId !== undefined) {
        getPlayer().then((player) => setPlayer(player));
        getPlayerLastGames().then((lastGames) =>
          setLastGames(
            lastGames
              .slice()
              .sort((a, b) => parseInt(b.game.gameId) - parseInt(b.game.gameId))
          )
        );
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
            <Grid container justifyContent="flex-start">
              <Grid item xs={12}>
                <Typography className={classes.text}>
                  Team{" "}
                  <Button
                    href={`../team/${player.team.teamId}`}
                    disabled={player.team === null}
                    color="primary"
                    className={classes.teamLink}
                  >
                    <strong>{player.team.name}</strong>
                  </Button>
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3} md={2}>
                <Typography className={classes.text}>
                  Age: <strong>{player.age}</strong>
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3} md={2}>
                <Typography className={classes.text}>
                  Next Available Round:{" "}
                  <strong>{player.nextAvailableRound}</strong>
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3} md={2}>
                <Typography className={classes.text}>
                  Fitness: <strong>{player.physicalStrength}</strong>
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3} md={2}>
                <Typography className={classes.text}>
                  Maturity: <strong>{player.maturity}</strong>
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3} md={2}>
                <Typography className={classes.text}>
                  Debut Season: <strong>{player.debutSeason.seasonId}</strong>
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3} md={2}>
                <Typography className={classes.text}>
                  Retired: <strong>{player.retired ? "Yes" : "No"}</strong>
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
