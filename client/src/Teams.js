import React, { useState, useEffect, useRef } from "react";
import { makeStyles } from "@material-ui/core/styles";
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import Paper from "@material-ui/core/Paper";
import Grid from "@material-ui/core/Grid";

import { getContractsAndAccount, parseErrorCode } from "./utils";

const useStyles = makeStyles((theme) => ({
  container: {
    display: "flex",
    flexWrap: "wrap",
  },
  textField: {
    marginLeft: theme.spacing(1),
    marginRight: theme.spacing(1),
  },
  dense: {
    marginTop: theme.spacing(2),
  },
  menu: {
    width: 200,
  },
  paper: {
    padding: theme.spacing(2),
    textAlign: "center",
    color: theme.palette.text.secondary,
  },
}));

const Teams = () => {
  const classes = useStyles();
  const teamContract = useRef(undefined);
  const utilsContract = useRef(undefined);
  const currentUser = useRef(undefined);
  const [teams, setTeams] = useState([]);
  const [name, setTeamName] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);

  useEffect(() => {
    const init = async () => {
      window.ethereum.on("accountsChanged", (accounts) => {
        currentUser.current = accounts[0];
      });

      // Get contract instances.
      const contractsAndAccount = await getContractsAndAccount();
      teamContract.current = contractsAndAccount.TeamContract;
      utilsContract.current = contractsAndAccount.UtilsContract;
      currentUser.current = contractsAndAccount.Account;
      const teams = await teamContract.current.methods.GetTeams().call();
      setTeams(teams);
    };
    init();
  }, []);

  const displayTeams = () => {
    return teams.map((team) => {
      return (
        <Grid item xs={6} key={team.id}>
          <Paper className={classes.paper}>
            <strong>{team.id}</strong> {team.name} {team.logoUrl}
          </Paper>
        </Grid>
      );
    });
  };

  const handleSubmit = async () => {
    const imageURL = imageUrl;

    await teamContract.current.methods
      .ClaimTeam(name, imageURL)
      .send({ from: currentUser.current })
      .then(() => {
        alert("Successfully claimed a team");
      })
      .catch(async (e) => {
        alert(await parseErrorCode(utilsContract.current, e.message));
      });

    const teams = await teamContract.current.methods.GetTeams().call();
    setTeams(teams);
  };

  return (
    <div className="main-container">
      <div className="claim-team-container">
        <h2>Claim A New Team</h2>

        <label>Name</label>
        <TextField
          id="team-name"
          className={classes.textField}
          placeholder="Team Name"
          margin="normal"
          onChange={(e) => setTeamName(e.target.value)}
          variant="outlined"
          inputProps={{ "aria-label": "bare" }}
        />

        <label>Logo</label>
        <TextField
          id="team-logo"
          className={classes.textField}
          placeholder="Team Logo"
          margin="normal"
          onChange={(e) => setImageUrl(e.target.value)}
          variant="outlined"
          inputProps={{ "aria-label": "bare" }}
        />

        <Button
          onClick={handleSubmit}
          variant="contained"
          className={classes.button}
        >
          Claim
        </Button>
      </div>
      <div className="list-teams-container">
        <Grid container spacing={4}>
          {displayTeams()}
        </Grid>
      </div>
    </div>
  );
};

export default Teams;
