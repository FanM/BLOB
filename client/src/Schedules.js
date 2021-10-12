import React, { useState, useEffect, useCallback } from "react";
import { gql } from "@apollo/client";
import { makeStyles } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import Grid from "@material-ui/core/Grid";
import Chip from "@material-ui/core/Chip";
import Button from "@material-ui/core/Button";
import Typography from "@material-ui/core/Typography";
import TextField from "@material-ui/core/TextField";

import { timestampToDate } from "./utils";

const useStyles = makeStyles((theme) => ({
  container: {
    display: "flex",
    flexWrap: "wrap",
  },
  chip: {
    margin: theme.spacing(2),
  },
  input: {
    display: "none",
  },
  title: {
    justifyContent: "space-around",
    spacing: theme.spacing(2),
    margin: theme.spacing(2),
    padding: theme.spacing(2),
  },
  paper: {
    opacity: 0.99,
    margin: theme.spacing(2),
    padding: theme.spacing(1),
    textAlign: "center",
    color: theme.palette.text.secondary,
  },
  text: { margin: theme.spacing(2), color: theme.palette.text.secondary },
  dateInput: { margin: theme.spacing(1) },
}));

const SEASON_STATE = ["ACTIVE", "ENDSEASON", "DRAFT", "PRESEASON"];

const Schedules = ({ season, setTitle, showMessage, graph_client }) => {
  const classes = useStyles();
  const [schedules, setSchedules] = useState([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showBanner, setShowBanner] = useState(true);

  const updateSchedules = useCallback(
    (filterStr) => {
      const querySchedules = `
      query {
        games(orderBy: gameId,
              ${filterStr}){
          scheduledTime,
          season {
            seasonId
          },
          gameId,
          hostTeam {
            teamId,
            name
          },
          guestTeam {
            teamId,
            name
          },
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
          query: gql(querySchedules),
        })
        .then((data) => {
          setSchedules(data.data.games);
        });
    },
    [graph_client]
  );

  useEffect(() => {
    const init = () => {
      setTitle("Schedules");
      if (graph_client !== null && season.seasonId !== undefined) {
        const filterStr = `where: { season: "${season.seasonId}", matchRound: ${season.matchRound}}`;
        updateSchedules(filterStr).catch((e) => showMessage(e.message, true));
      }
    };
    init();
  }, [season, setTitle, showMessage, updateSchedules, graph_client]);

  const searchGames = () => {
    let fromFilter = "";
    if (fromDate !== "") {
      const from = new Date(`${fromDate}T00:00:00`).getTime() / 1000;
      fromFilter = `, scheduledTime_gte: ${from}`;
    }
    let toFilter = "";
    if (toDate !== "") {
      const to = new Date(`${toDate}T23:59:59`).getTime() / 1000;
      toFilter = `, scheduledTime_lte: ${to}`;
    }
    const filterStr = `where: { season: "${season.seasonId}" ${fromFilter} ${toFilter}}`;
    setShowBanner(false);
    updateSchedules(filterStr).catch((e) => showMessage(e.message, true));
  };

  const displaySchedules = () => {
    return schedules.map((game, index) => {
      return (
        <Grid item xs={12} sm={6} md={3} key={index}>
          <Paper elevation={3} className={classes.paper}>
            <Chip label={game.gameId} className={classes.chip} />
            <Typography>
              <strong>{game.hostTeam.name}</strong> vs{" "}
              <strong>{game.guestTeam.name}</strong>
            </Typography>
            <Typography>
              <strong>
                {game.hostForfeit
                  ? "F"
                  : game.hostScore === null
                  ? 0
                  : game.hostScore}{" "}
                :{" "}
                {game.guestForfeit
                  ? "F"
                  : game.guestScore === null
                  ? 0
                  : game.guestScore}
              </strong>{" "}
            </Typography>
            {game.overtimeCount === 1 && (
              <Typography>
                <strong>OT</strong>
              </Typography>
            )}
            {game.overtimeCount > 1 && (
              <Typography>
                {game.overtimeCount} <strong>OT</strong>
              </Typography>
            )}
            {game.hostScore === null && (
              <Typography>
                <em>{timestampToDate(game.scheduledTime)}</em>
              </Typography>
            )}
            {game.hostScore !== null && (
              <Button
                href={`match/${season.seasonId}/${game.gameId}`}
                color="primary"
              >
                game stats
              </Button>
            )}
          </Paper>
        </Grid>
      );
    });
  };

  return (
    <div className={classes.container}>
      <Grid container className={classes.title}>
        <Grid item>
          <Typography color="primary">
            SEASON <strong>{season.seasonId}</strong>
          </Typography>
        </Grid>
        <Grid item>
          <Typography color="primary">
            ROUND <strong>{season.matchRound}</strong>
          </Typography>
        </Grid>
        <Grid item>
          <Typography color="primary">
            STATE <strong>{SEASON_STATE[season.seasonState]}</strong>
          </Typography>
        </Grid>
      </Grid>
      {showBanner && (
        <Grid container justifyContent="center">
          <Grid item>
            <Typography variant="overline" className={classes.text}>
              Upcoming games
            </Typography>
          </Grid>
        </Grid>
      )}
      <Grid container justifyContent="flex-start">
        {displaySchedules()}
      </Grid>
      <Grid container justifyContent="center">
        <Grid item>
          <TextField
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            label="Start Date"
            type="date"
            className={classes.dateInput}
            InputLabelProps={{
              shrink: true,
            }}
          />
        </Grid>
        <Grid item>
          <TextField
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            label="End Date"
            type="date"
            className={classes.dateInput}
            InputLabelProps={{
              shrink: true,
            }}
          />
        </Grid>
        <Grid container justifyContent="center">
          <Button color="primary" onClick={searchGames}>
            search
          </Button>
        </Grid>
      </Grid>
    </div>
  );
};

export default Schedules;
