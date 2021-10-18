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

import SeasonPicker from "./SeasonPicker";
import { parseErrorCode } from "./utils";

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
  statsCell: {
    padding: theme.spacing(0.5),
    marginLeft: theme.spacing(1),
    marginRight: theme.spacing(2),
    minWidth: 40,
  },
  teamLink: {
    marginLeft: theme.spacing(0),
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
  claimPlayer: {
    justifyContent: "center",
    textAlign: "center",
  },
  claimTitle: {
    color: theme.palette.text.secondary,
    marginTop: theme.spacing(3),
  },
});

const PlayerProfileTable = ({ classes, player, langObj }) => {
  return (
    <TableContainer component={Paper} className={classes.table}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell align="center" className={classes.statsCell}>
              {langObj.playerAttributes.TABLE_HEADER_FIELD_GOAL}
            </TableCell>
            <TableCell align="center" className={classes.statsCell}>
              {langObj.playerAttributes.TABLE_HEADER_3_POINT}
            </TableCell>
            <TableCell align="center" className={classes.statsCell}>
              {langObj.playerAttributes.TABLE_HEADER_ASSIST}
            </TableCell>
            <TableCell align="center" className={classes.statsCell}>
              {langObj.playerAttributes.TABLE_HEADER_REBOUND}
            </TableCell>
            <TableCell align="center" className={classes.statsCell}>
              {langObj.playerAttributes.TABLE_HEADER_BLOCK}
            </TableCell>
            <TableCell align="center" className={classes.statsCell}>
              {langObj.playerAttributes.TABLE_HEADER_STEAL}
            </TableCell>
            <TableCell align="center" className={classes.statsCell}>
              {langObj.playerAttributes.TABLE_HEADER_FREE_THROW}
            </TableCell>
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
  langObj,
  handleChangePage,
  handleChangeRowsPerPage,
}) => {
  return (
    <Fragment>
      <TableContainer component={Paper} className={classes.table}>
        <Table>
          <TableHead>
            <TableRow align="right">
              <TableCell align="center" className={classes.statsCell}>
                {langObj.playerStats.TABLE_HEADER_GAME}
              </TableCell>
              <TableCell align="center" className={classes.statsCell}>
                {langObj.playerStats.TABLE_HEADER_MINUTES}
              </TableCell>
              <TableCell align="center" className={classes.statsCell}>
                {langObj.playerStats.TABLE_HEADER_POINTS}
              </TableCell>
              <TableCell align="center" className={classes.statsCell}>
                {langObj.matchStats.TABLE_HEADER_FIELD_GOAL_MADE}
              </TableCell>
              <TableCell align="center" className={classes.statsCell}>
                {langObj.matchStats.TABLE_HEADER_FIELD_GOAL_ATTEMPT}
              </TableCell>
              <TableCell align="center" className={classes.statsCell}>
                {langObj.matchStats.TABLE_HEADER_3POINT_MADE}
              </TableCell>
              <TableCell align="center" className={classes.statsCell}>
                {langObj.matchStats.TABLE_HEADER_3POINT_ATTEMPT}
              </TableCell>
              <TableCell align="center" className={classes.statsCell}>
                {langObj.matchStats.TABLE_HEADER_FREE_THROW_MADE}
              </TableCell>
              <TableCell align="center" className={classes.statsCell}>
                {langObj.matchStats.TABLE_HEADER_FREE_THROW_ATTEMPT}
              </TableCell>
              <TableCell align="center" className={classes.statsCell}>
                {langObj.playerStats.TABLE_HEADER_ASSISTS}
              </TableCell>
              <TableCell align="center" className={classes.statsCell}>
                {langObj.playerStats.TABLE_HEADER_REBOUNDS}
              </TableCell>
              <TableCell align="center" className={classes.statsCell}>
                {langObj.playerStats.TABLE_HEADER_BLOCKS}
              </TableCell>
              <TableCell align="center" className={classes.statsCell}>
                {langObj.playerStats.TABLE_HEADER_STEALS}
              </TableCell>
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
                <TableCell align="center">{stat.min}</TableCell>
                <TableCell align="center">{stat.pts}</TableCell>
                <TableCell align="center">{stat.fgm}</TableCell>
                <TableCell align="center">{stat.fga}</TableCell>
                <TableCell align="center">{stat.tpm}</TableCell>
                <TableCell align="center">{stat.tpa}</TableCell>
                <TableCell align="center">{stat.ftm}</TableCell>
                <TableCell align="center">{stat.fta}</TableCell>
                <TableCell align="center">{stat.ast}</TableCell>
                <TableCell align="center">{stat.reb}</TableCell>
                <TableCell align="center">{stat.blk}</TableCell>
                <TableCell align="center">{stat.stl}</TableCell>
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
  ({
    classes,
    seasonId,
    setTitle,
    showMessage,
    showLoading,
    blobContracts,
    currentUser,
    graph_client,
    langObj,
  }) => {
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

    const handleClaim = () => {
      showLoading(true);
      blobContracts.TeamContract.methods
        .ClaimPlayer(playerId)
        .send({ from: currentUser })
        .then(() => {
          showMessage(langObj.errorDesc.CONTRACT_OPERATION_SUCCEEDED);
        })
        .catch((e) => {
          showMessage(parseErrorCode(langObj.errorDesc, e.reason), true);
        })
        .finally(() => showLoading(false));
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

      setTitle(langObj.mainMenuItems.MAIN_MENU_PLAYER_PROFILE);
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
      langObj,
      getPlayerLastGames,
    ]);

    return (
      <Grid container justifyContent="center">
        <Card elevation={3} style={{ width: 325 }} className={classes.card}>
          <CardHeader
            title={`#${player.playerId}`}
            subheader={
              player.position !== undefined
                ? langObj.playerCard.POSITIONS[player.position].name
                : ""
            }
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
                  {langObj.playerProfile.PLAYER_PROFILE_TEAM_LABEL}
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
                  {`${langObj.playerProfile.PLAYER_PROFILE_AGE_LABEL}: `}
                  <strong>{player.age}</strong>
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3} md={2}>
                <Typography className={classes.text}>
                  {`${langObj.playerProfile.PLAYER_PROFILE_AVAILABLE_ROUND_LABEL}: `}
                  <strong>{player.nextAvailableRound}</strong>
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3} md={2}>
                <Typography className={classes.text}>
                  {`${langObj.playerProfile.PLAYER_PROFILE_FITNESS_LABEL}: `}
                  <strong>{player.physicalStrength}</strong>
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3} md={2}>
                <Typography className={classes.text}>
                  {`${langObj.playerProfile.PLAYER_PROFILE_MATURITY_LABEL}: `}
                  <strong>{player.maturity}</strong>
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3} md={2}>
                <Typography className={classes.text}>
                  {`${langObj.playerProfile.PLAYER_PROFILE_DEBUT_SEASON_LABEL}: `}
                  <strong>{player.debutSeason.seasonId}</strong>
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3} md={2}>
                <Typography className={classes.text}>
                  {`${langObj.playerProfile.PLAYER_PROFILE_RETIRED_LABEL}: `}
                  <strong>
                    {player.retired
                      ? langObj.playerProfile.PLAYER_PROFILE_YES_LABEL
                      : langObj.playerProfile.PLAYER_PROFILE_NO_LABEL}
                  </strong>
                </Typography>
              </Grid>
              <PlayerProfileTable
                classes={classes}
                player={player}
                langObj={langObj}
              />
              <Grid container alignItems="center">
                <Grid item>
                  <Typography className={classes.text}>
                    {langObj.playerProfile.PLAYER_PROFILE_LATEST_GAMES_LABEL}
                  </Typography>
                </Grid>
                <Grid item>
                  {seasonId !== undefined && (
                    <SeasonPicker
                      styleClass={classes.seasonPicker}
                      currentSeason={seasonId}
                      seasons={[...Array(parseInt(seasonId)).keys()].map(
                        (k) => k + 1
                      )}
                      langObj={langObj}
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
                langObj={langObj}
                handleChangePage={handleChangePage}
                handleChangeRowsPerPage={handleChangeRowsPerPage}
              />
            </Grid>
            <Grid container className={classes.claimPlayer}>
              <Grid item>
                <Typography variant="subtitle1" className={classes.claimTitle}>
                  {langObj.playerProfile.PLAYER_PROFILE_CLAIM_PLAYER_LABEL}
                </Typography>
              </Grid>
              <Grid container justifyContent="center">
                <Grid item>
                  <Button onClick={handleClaim} color="primary">
                    {langObj.playerProfile.PLAYER_PROFILE_CLAIM_PLAYER_BUTTON}
                  </Button>
                </Grid>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    );
  }
);

export default PlayerProfile;
