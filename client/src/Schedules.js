import React, { useState, useEffect, useRef } from "react";
import { makeStyles } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import Grid from "@material-ui/core/Grid";
import Chip from "@material-ui/core/Chip";
import Typography from "@material-ui/core/Typography";

import { getContractsAndAccount } from "./utils";

const useStyles = makeStyles((theme) => ({
  container: {
    display: "flex",
    flexWrap: "wrap",
  },
  button: {
    margin: theme.spacing(1),
  },
  input: {
    display: "none",
  },
  paper: {
    padding: theme.spacing(2),
    textAlign: "center",
    color: theme.palette.text.secondary,
  },
}));

const Schedules = ({ setTitle }) => {
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
          guest: guest.name,
          guestScore: match.guestScore,
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
          <Paper className={classes.paper}>
            <Chip label={match.id} />
            <Typography>
              {match.host}{" "}
              <strong>
                {match.hostScore} : {match.guestScore}
              </strong>{" "}
              {match.guest}
            </Typography>
          </Paper>
        </Grid>
      );
    });
  };

  return (
    <div className="main-container">
      <div className="match-schedules-container">
        <Grid container justifyContent="center" spacing={2}>
          <Grid item xs={6}>
            <Typography color="primary">
              SEASON <strong>{season[0]}</strong>
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography color="primary">
              ROUND <strong>{season[1]}</strong>
            </Typography>
          </Grid>
        </Grid>
        <Grid container justifyContent="space-around" spacing={4}>
          {displaySchedules()}
        </Grid>
      </div>
    </div>
  );
};

export default Schedules;
