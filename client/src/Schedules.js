import React, { useState, useEffect, useRef } from "react";
import { makeStyles } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import Grid from "@material-ui/core/Grid";
import Chip from "@material-ui/core/Chip";
import Button from "@material-ui/core/Button";
import Typography from "@material-ui/core/Typography";

import { getContractsAndAccount } from "./utils";

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
    margin: theme.spacing(2),
    padding: theme.spacing(2),
  },
  paper: {
    margin: theme.spacing(2),
    padding: theme.spacing(1),
    textAlign: "center",
    color: theme.palette.text.secondary,
  },
}));

const SEASON_STATE = ["ACTIVE", "ENDSEASON", "DRAFT", "OFFSEASON"];

const Schedules = ({ setTitle, seasonState }) => {
  const classes = useStyles();
  const seasonContract = useRef(undefined);
  const teamContract = useRef(undefined);
  const utilsContract = useRef(undefined);
  const currentUser = useRef(undefined);
  const [schedules, setSchedules] = useState([]);
  const [season, setSeason] = useState([]);

  useEffect(() => {
    const init = async () => {
      window.ethereum.on("accountsChanged", (accounts) => {
        currentUser.current = accounts[0];
      });

      setTitle("Schedules");
      // Get contracts instance.
      const contractsAndAccount = await getContractsAndAccount();
      teamContract.current = contractsAndAccount.TeamContract;
      seasonContract.current = contractsAndAccount.SeasonContract;
      utilsContract.current = contractsAndAccount.UtilsContract;
      currentUser.current = contractsAndAccount.Account;
      await updateSeasonInfo();
      await updateSchedules();
    };
    init();
  }, [setTitle]);

  const updateSchedules = async () => {
    const schedules = await seasonContract.current.methods
      .GetMatchList()
      .call();
    const decoratedSchedules = await Promise.all(
      schedules.map(async (match) => {
        const host = await teamContract.current.methods
          .GetTeam(match.hostTeam)
          .call();
        const guest = await teamContract.current.methods
          .GetTeam(match.guestTeam)
          .call();
        return {
          id: match.matchId,
          host: host.name,
          hostScore: match.hostScore,
          hostForfeit: match.hostForfeit,
          guest: guest.name,
          guestScore: match.guestScore,
          guestForfeit: match.guestForfeit,
          overtimeCount: parseInt(match.overtimeCount),
        };
      })
    );
    setSchedules(decoratedSchedules);
  };

  const updateSeasonInfo = () => {
    seasonContract.current.methods
      .seasonId()
      .call()
      .then((seasonId) => {
        seasonContract.current.methods
          .matchRound()
          .call()
          .then((matchRound) => setSeason([seasonId, matchRound]));
      });
  };

  const displaySchedules = () => {
    return schedules.map((match) => {
      return (
        <Grid item xs={6} key={match.id}>
          <Paper elevation={3} className={classes.paper}>
            <Chip label={match.id} className={classes.chip} />
            <Typography>
              {match.host}{" "}
              <strong>
                {match.hostForfeit ? "F" : match.hostScore} :{" "}
                {match.guestForfeit ? "F" : match.guestScore}
              </strong>{" "}
              {match.guest}
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
            <Button href={`match/${season[0]}/${match.id}`}
            color="primary"
            disabled={match.hostScore === "0" && !match.hostForfeit}>
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
            SEASON <strong>{season[0]}</strong>
          </Typography>
        </Grid>
        <Grid item>
          <Typography color="primary">
            ROUND <strong>{season[1]}</strong>
          </Typography>
        </Grid>
        <Grid item>
          <Typography color="primary">
            STATE <strong>{SEASON_STATE[seasonState]}</strong>
          </Typography>
        </Grid>
      </Grid>
      <Grid container justifyContent="center" >
        {displaySchedules()}
      </Grid>
    </div>
  );
};

export default Schedules;
