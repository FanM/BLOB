import React, { useEffect, useState, Fragment } from "react";
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
import TablePagination from "@material-ui/core/TablePagination";
import Paper from "@material-ui/core/Paper";
import Grid from "@material-ui/core/Grid";
import Button from "@material-ui/core/Button";
import Typography from "@material-ui/core/Typography";
import FaceIcon from "@material-ui/icons/Face";

import { POSITIONS } from "./PlayerCard";
import SeasonPicker from "./SeasonPicker";

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
  pagination: {
    marginLeft: "auto",
  },
  seasonPicker: {
    margin: theme.spacing(1),
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

const PlayerStatsTable = ({
  classes,
  seasonId,
  lastGames,
  rowsPerPage,
  page,
  handleChangePage,
  handleChangeRowsPerPage,
}) => {
  return (
    <Fragment>
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
            {lastGames.list.map((stat, index) => (
              <TableRow key={index}>
                <TableCell align="center" className={classes.cell}>
                  <Button
                    href={`../match/${seasonId}/${stat.gameId}`}
                    color="primary"
                    className={classes.gameLink}
                  >
                    {stat.gameId}
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
      <TablePagination
        className={classes.pagination}
        rowsPerPageOptions={[5, 10]}
        component="div"
        count={lastGames.count}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Fragment>
  );
};

const PlayerProfile = withStyles(styles)(
  ({ classes, seasonId, setTitle, showMessage, graph_client }) => {
    let { playerId } = useParams();
    const [player, setPlayer] = useState({
      debutSeason: { seasonId: "" },
      team: { name: "" },
    });
    const [season, setSeason] = useState(undefined);
    const [lastGames, setLastGames] = useState({ count: -1, list: [] });
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);

    const handleChangePage = (event, newPage) => {
      setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
      setRowsPerPage(parseInt(event.target.value));
      setPage(0);
    };

    const getPlayerLastGames = useEffect(() => {
      const playerGameQuery = `
        query {
          playerGameStats(orderBy: gameId, orderDirection: desc,
                          where: { player: "${playerId}",
                                   season: "${season}"},
                                   skip: ${page * rowsPerPage},
                                   first: ${rowsPerPage}) {
              gameId,
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
      if (season !== undefined)
        graph_client
          .query({
            query: gql(playerGameQuery),
          })
          .then((data) => {
            const totalCount = page * rowsPerPage + rowsPerPage;
            const lastGames = data.data.playerGameStats;
            const count =
              rowsPerPage === lastGames.length
                ? -1
                : totalCount - rowsPerPage + lastGames.length;
            setLastGames({ list: lastGames, count: count });
          })
          .catch((e) => showMessage(e.message, true));
    }, [season, playerId, page, rowsPerPage, graph_client, showMessage]);

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

      setTitle("Player Profile");
      if (graph_client !== null && seasonId !== undefined) {
        getPlayer().then((player) => setPlayer(player));
        setSeason(parseInt(seasonId));
      }
    }, [
      playerId,
      seasonId,
      setTitle,
      showMessage,
      graph_client,
      getPlayerLastGames,
    ]);

    return (
      <Grid container justifyContent="center">
        <Card elevation={3} style={{ width: 325 }} className={classes.card}>
          <CardHeader
            title={`#${player.playerId}`}
            subheader={player.position ? POSITIONS[player.position].name : ""}
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
              <Grid container alignItems="center">
                <Grid item>
                  <Typography className={classes.text}>Latest Games</Typography>
                </Grid>
                <Grid item>
                  {seasonId !== undefined && (
                    <SeasonPicker
                      styleClass={classes.seasonPicker}
                      currentSeason={seasonId}
                      seasons={[...Array(parseInt(seasonId)).keys()].map(
                        (k) => k + 1
                      )}
                      handleSeasonChange={(s) => setSeason(s)}
                    />
                  )}
                </Grid>
              </Grid>
              <PlayerStatsTable
                classes={classes}
                seasonId={season}
                lastGames={lastGames}
                page={page}
                rowsPerPage={rowsPerPage}
                handleChangePage={handleChangePage}
                handleChangeRowsPerPage={handleChangeRowsPerPage}
              />
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    );
  }
);

export default PlayerProfile;
