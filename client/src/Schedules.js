import React, { useState, useEffect } from "react";
import { gql } from "@apollo/client";
import { makeStyles } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import Grid from "@material-ui/core/Grid";
import Chip from "@material-ui/core/Chip";
import Button from "@material-ui/core/Button";
import Typography from "@material-ui/core/Typography";

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
    justifyContent: "flex-start",
    margin: theme.spacing(2),
    padding: theme.spacing(2),
  },
  paper: {
    margin: theme.spacing(2),
    padding: theme.spacing(1),
    textAlign: "center",
    color: theme.palette.text.secondary,
  },
  time: {
    color: theme.palette.text.inherit,
  },
}));

const Schedules = ({ setTitle, showMessage, graph_client }) => {
  const classes = useStyles();
  const [schedules, setSchedules] = useState([]);
  const [seasonId, setSeasonId] = useState(undefined);

  useEffect(() => {
    const updateSchedules = (seasonId) => {
      const querySchedules = `
      query {
        gameStats(orderBy: matchId,
            where: { seasonId: ${seasonId}}){
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
          query: gql(querySchedules),
        })
        .then((data) => {
          console.log(data.data);
          setSchedules(data.data.gameStats);
        });
    };

    const updateSeasonInfo = () => {
      const querySeasonId = `
      query {
        gameStats(orderBy: seasonId, orderDirection: desc
                  first: 1){
          seasonId,
        }
      }
      `;
      return graph_client
        .query({
          query: gql(querySeasonId),
        })
        .then((data) => data.data.gameStats[0].seasonId);
    };

    const init = () => {
      setTitle("Schedules");
      if (graph_client !== null) {
        updateSeasonInfo()
          .then((seasonId) => {
            setSeasonId(seasonId);
            return updateSchedules(seasonId);
          })
          .catch((e) => showMessage(e.message, true));
      }
    };
    init();
  }, [setTitle, showMessage, graph_client]);

  const displaySchedules = () => {
    return schedules.map((match, index) => {
      return (
        <Grid item xs={12} sm={6} key={index}>
          <Paper elevation={3} className={classes.paper}>
            <Chip label={match.matchId} className={classes.chip} />
            <Typography>
              {`TEAM ${match.hostTeam} vs TEAM ${match.guestTeam}`}
            </Typography>
            <Typography>
              <strong>
                {match.hostForfeit
                  ? "F"
                  : match.hostScore === null
                  ? 0
                  : match.hostScore}{" "}
                :{" "}
                {match.guestForfeit
                  ? "F"
                  : match.guestScore === null
                  ? 0
                  : match.guestScore}
              </strong>{" "}
            </Typography>
            {match.overtimeCount === 1 && (
              <Typography>
                <strong>OT</strong>
              </Typography>
            )}
            {match.overtimeCount > 1 && (
              <Typography>
                match.overtimeCount <strong>OT</strong>
              </Typography>
            )}
            <Button
              href={`match/${seasonId}/${match.matchId}`}
              color="primary"
              disabled={match.hostScore === "0" && !match.hostForfeit}
            >
              game stats
            </Button>
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
            SEASON <strong>{seasonId}</strong>
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
