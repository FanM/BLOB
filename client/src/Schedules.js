import React, { useState, useEffect, useRef } from "react";
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

const Schedules = (props) => {
  const classes = useStyles();
  const contractsAndAccount = useRef(undefined);
  const currentUser = useRef(undefined);
  const [schedules, setSchedules] = useState([]);
  const { getContracts, parseErrorCode } = props;

  window.ethereum.on("accountsChanged", (accounts) => {
    currentUser.current = accounts[0];
  });

  useEffect(() => {
    const init = async () => {
      // Get contracts instance.
      contractsAndAccount.current = await getContracts();
      currentUser.current = contractsAndAccount.current.Account;
      await updateSchedules();
    };
    init();
  }, [getContracts]);

  const updateSchedules = async () => {
    const schedules = await contractsAndAccount.current.SeasonContract.methods
      .GetMatchList()
      .call();
    const decoratedSchedules = await Promise.all(
      schedules.map(async (match) => {
        const host = await contractsAndAccount.current.TeamContract.methods
          .GetTeam(match.hostTeam)
          .call();
        const guest = await contractsAndAccount.current.TeamContract.methods
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
    await contractsAndAccount.current.LeagueContract.methods
      .StartSeason()
      .send({ from: currentUser.current })
      .then(() => alert("Successfully started a season"))
      .catch(async (e) => alert(await parseErrorCode(e.message)));

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
      </div>
      <div className="match-schedules-container">
        <h2>Schedules</h2>
        <Grid container justifyContent="space-around" spacing={4}>
          {displaySchedules()}
        </Grid>
      </div>
    </div>
  );
};

export default Schedules;
