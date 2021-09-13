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

import { parseErrorCode } from "./utils";
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
  blobContracts,
  currentUser,
  setTeams,
  showMessage,
  showLoading,
}) => {
  const teamName = useRef(null);
  const imageUrl = useRef(null);

  const handleSubmit = () => {
    if (teamName.current === "" || imageUrl.current === "") {
      showMessage("Empty name or image URL", true);
      return;
    }
    showLoading(true);
    blobContracts.TeamContract.methods
      .ClaimTeam(teamName.current, imageUrl.current)
      .send({ from: currentUser })
      .then(() => {
        showMessage("Successfully claimed a team");
        return blobContracts.TeamContract.methods.GetTeams().call();
      })
      .then((teams) => setTeams(teams))
      .catch((e) => {
        parseErrorCode(blobContracts.UtilsContract, e.message).then((s) =>
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
        <Button onClick={handleSubmit} color="primary">
          Claim
        </Button>
      </Grid>
    </Grid>
  );
};

const TeamsBar = ({
  classes,
  width,
  setTitle,
  showMessage,
  showLoading,
  blobContracts,
  currentUser,
}) => {
  const [teams, setTeams] = useState([]);

  useEffect(() => {
    const init = () => {
      setTitle("Teams");
      blobContracts.TeamContract.methods
        .GetTeams()
        .call()
        .then((teams) => setTeams(teams));
    };
    if (blobContracts !== null) init();
  }, [setTitle, blobContracts]);

  return (
    <div className={classes.root}>
      <ManagementTabContainer>
        <ManagmentTabContent label="Teams">
          <TeamList classes={classes} teams={teams} setTitle={setTitle} />
        </ManagmentTabContent>
        <ManagmentTabContent label="Claim Team">
          <ClaimTeam
            classes={classes}
            blobContracts={blobContracts}
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
