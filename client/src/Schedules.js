import React, { useState, useEffect, useRef } from "react";
import { makeStyles } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import Grid from "@material-ui/core/Grid";
import Chip from "@material-ui/core/Chip";
import Button from "@material-ui/core/Button";
import Typography from "@material-ui/core/Typography";

import { getContractsAndAccount, parseErrorCode } from "./utils";

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
  const leagueContract = useRef(undefined);
  const seasonContract = useRef(undefined);
  const teamContract = useRef(undefined);
  const utilsContract = useRef(undefined);
  const currentUser = useRef(undefined);
  const [schedules, setSchedules] = useState([]);

  useEffect(() => {
    const init = async () => {
      window.ethereum.on("accountsChanged", (accounts) => {
        currentUser.current = accounts[0];
      });

      setTitle("Schedules");
      // Get contracts instance.
      const contractsAndAccount = await getContractsAndAccount();
      leagueContract.current = contractsAndAccount.LeagueContract;
      teamContract.current = contractsAndAccount.TeamContract;
      seasonContract.current = contractsAndAccount.SeasonContract;
      utilsContract.current = contractsAndAccount.UtilsContract;
      currentUser.current = contractsAndAccount.Account;
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

  const startSeason = async () => {
    await leagueContract.current.methods
      .StartSeason()
      .send({ from: currentUser.current })
      .then(() => alert("Successfully started a season"))
      .catch(async (e) =>
        alert(await parseErrorCode(utilsContract.current, e.message))
      );

    await updateSchedules();
  };

  const playMatch = async () => {
    await leagueContract.current.methods
      .PlayMatch()
      .send({ from: currentUser.current })
      .then(() => alert("Successfully played a match"))
      .catch(async (e) =>
        alert(await parseErrorCode(utilsContract.current, e.message))
      );

    await updateSchedules();
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
      <div className="start-season-container">
        <Button
          onClick={startSeason}
          variant="contained"
          className={classes.button}
        >
          Start Season
        </Button>
        <Button
          onClick={playMatch}
          variant="contained"
          className={classes.button}
        >
          Play Game
        </Button>
      </div>
      <div className="match-schedules-container">
        <Grid container justifyContent="space-around" spacing={4}>
          {displaySchedules()}
        </Grid>
      </div>
    </div>
  );
};

export default Schedules;
