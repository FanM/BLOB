import React, { useState, useEffect } from "react";
import { makeStyles } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import Grid from "@material-ui/core/Grid";
import Chip from "@material-ui/core/Chip";
import Typography from "@material-ui/core/Typography";

import { getContractsAndAccount } from "./utils";

const useStyles = makeStyles((theme) => ({
  button: {
    margin: theme.spacing(1),
  },
  input: {
    display: "none",
  },
  paper: {
    padding: theme.spacing(2),
    textAlign: "center",
    color: theme.palette.text.primary,
  },
}));

const Standings = (props) => {
  const classes = useStyles();
  const [standings, setStandings] = useState([]);

  useEffect(() => {
    const init = async () => {
      const contractsAndAccount = await getContractsAndAccount();
      const standings = await contractsAndAccount.SeasonContract.methods
        .GetTeamRanking()
        .call();
      const rankings = [];
      for (let i = 0; i < standings.length; i++) {
        const team = await contractsAndAccount.TeamContract.methods
          .GetTeam(standings[i])
          .call();
        rankings.push({ rank: i + 1, team: team });
      }
      setStandings(rankings);
    };
    init();
  }, []);

  const displayStandings = () => {
    return standings.map((standing) => {
      return (
        <Grid item xs={9} key={standing.team.id}>
          <Paper className={classes.paper}>
            <Chip label={standing.rank} />
            <Typography>{standing.team.name}</Typography>
          </Paper>
        </Grid>
      );
    });
  };

  return (
    <div className="main-container">
      <Grid container justifyContent="space-around" spacing={4}>
        {displayStandings()}
      </Grid>
    </div>
  );
};

export default Standings;
