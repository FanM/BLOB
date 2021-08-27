import React, { useState, useEffect, useRef } from "react";
import { withStyles } from "@material-ui/core/styles";
import withWidth from "@material-ui/core/withWidth";
import Avatar from "@material-ui/core/Avatar";
import Button from "@material-ui/core/Button";
import Grid from "@material-ui/core/Grid";
import TextField from "@material-ui/core/TextField";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import ListItemIcon from "@material-ui/core/ListItemIcon";

import TeamIcon from "@material-ui/icons/People";

import { getContractsAndAccount, parseErrorCode } from "./utils";
import { ManagementTabContainer, ManagmentTabContent } from "./AbstractTabs";

const styles = (theme) => ({
  root: {
    flexGrow: 1,
    backgroundColor: theme.palette.background.paper,
  },
  container: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-around",
    alignItems: "center",
  },
  textField: {
    marginLeft: theme.spacing(1),
    marginRight: theme.spacing(1),
  },
});

const TeamList = ({ classes, teams, setTitle }) => (
  <div className="list-teams-container">
    <List>
      {teams.map((team, index) => (
        <ListItem key={index} button component="a" href={"team/" + team.id}>
          <ListItemIcon>
            <Avatar>
              <TeamIcon />
            </Avatar>
          </ListItemIcon>
          <ListItemText
            primary={team.name}
            secondary={team.id + " " + team.logoUrl}
          />
        </ListItem>
      ))}
    </List>
  </div>
);

const ClaimTeam = ({
  classes,
  teamContract,
  utilsContract,
  currentUser,
  setTeams,
  showMessage,
  showLoading,
}) => {
  const teamName = useRef(null);
  const imageUrl = useRef(null);

  const handleSubmit = () => {
    showLoading(true);
    teamContract.current.methods
      .ClaimTeam(teamName.current, imageUrl.current)
      .send({ from: currentUser.current })
      .then(() => {
        showMessage("Successfully claimed a team");
        return teamContract.current.methods.GetTeams().call();
      })
      .then((teams) => setTeams(teams))
      .catch(async (e) => {
        parseErrorCode(utilsContract.current, e.message).then((s) =>
          showMessage(s, true)
        );
      })
      .finally(() => showLoading(false));
  };

  return (
    <Grid container className={classes.container}>
      <Grid item xs={4}>
        <TextField
          id="team-name"
          className={classes.textField}
          placeholder="Team Name"
          margin="normal"
          onChange={(e) => (teamName.current = e.target.value)}
          variant="outlined"
          inputProps={{ "aria-label": "bare" }}
        />
      </Grid>

      <Grid item xs={4}>
        <TextField
          id="team-logo"
          className={classes.textField}
          placeholder="Team Logo"
          margin="normal"
          onChange={(e) => (imageUrl.current = e.target.value)}
          variant="outlined"
          inputProps={{ "aria-label": "bare" }}
        />
      </Grid>

      <Grid item xs={2}>
        <Button
          onClick={handleSubmit}
          variant="contained"
          className={classes.button}
        >
          Claim
        </Button>
      </Grid>
    </Grid>
  );
};

const TeamsBar = ({ classes, width, setTitle, showMessage, showLoading }) => {
  const teamContract = useRef(undefined);
  const utilsContract = useRef(undefined);
  const currentUser = useRef(undefined);
  const [teams, setTeams] = useState([]);

  useEffect(() => {
    const init = async () => {
      window.ethereum.on("accountsChanged", (accounts) => {
        currentUser.current = accounts[0];
      });

      setTitle("Teams");
      // Get contract instances.
      const contractsAndAccount = await getContractsAndAccount();
      teamContract.current = contractsAndAccount.TeamContract;
      utilsContract.current = contractsAndAccount.UtilsContract;
      currentUser.current = contractsAndAccount.Account;
      const teams = await teamContract.current.methods.GetTeams().call();
      setTeams(teams);
    };
    init();
  }, [setTitle]);

  return (
    <div className={classes.root}>
      <ManagementTabContainer>
        <ManagmentTabContent label="Teams">
          <TeamList classes={classes} teams={teams} setTitle={setTitle} />
        </ManagmentTabContent>
        <ManagmentTabContent label="Claim Team">
          <ClaimTeam
            classes={classes}
            teamContract={teamContract}
            utilsContract={utilsContract}
            currentUser={currentUser}
            setTeams={setTeams}
            showMessage={showMessage}
            showLoading={showLoading}
          />
        </ManagmentTabContent>
      </ManagementTabContainer>
    </div>
  );
};
export default withWidth()(withStyles(styles)(TeamsBar));
