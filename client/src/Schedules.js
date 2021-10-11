import React, { useState, useEffect } from "react";
import { gql } from "@apollo/client";
import { makeStyles } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import Grid from "@material-ui/core/Grid";
import Chip from "@material-ui/core/Chip";
import Button from "@material-ui/core/Button";
import Typography from "@material-ui/core/Typography";

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
  time: {
    color: theme.palette.text.inherit,
  },
}));

const SEASON_STATE = ["ACTIVE", "ENDSEASON", "DRAFT", "PRESEASON"];

const Schedules = ({ season, setTitle, showMessage, graph_client }) => {
  const classes = useStyles();
  const [schedules, setSchedules] = useState([]);

  useEffect(() => {
    const updateSchedules = () => {
      const querySchedules = `
      query {
        games(orderBy: gameId,
            where: { season: "${season.seasonId}"}){
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
    };

    const init = () => {
      setTitle("Schedules");
      if (graph_client !== null && season.seasonId !== undefined) {
        updateSchedules().catch((e) => showMessage(e.message, true));
      }
    };
    init();
  }, [season, setTitle, showMessage, graph_client]);

  const displaySchedules = () => {
    return schedules.map((game, index) => {
      return (
        <Grid item xs={12} sm={6} md={3} key={index}>
          <Paper elevation={3} className={classes.paper}>
            <Chip label={game.gameId} className={classes.chip} />
            <Typography>
              {`${game.hostTeam.name} vs ${game.guestTeam.name}`}
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
              <Typography>{timestampToDate(game.scheduledTime)}</Typography>
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
      <Grid container justifyContent="center">
        {displaySchedules()}
      </Grid>
    </div>
  );
};

export default Schedules;
