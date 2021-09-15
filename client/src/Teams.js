import React, { useState, useEffect, useRef } from "react";
import { gql } from "@apollo/client";
import { withStyles } from "@material-ui/core/styles";
import withWidth from "@material-ui/core/withWidth";
import Button from "@material-ui/core/Button";
import Grid from "@material-ui/core/Grid";
import TextField from "@material-ui/core/TextField";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";

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
  teamItem: {
    margin: theme.spacing(0),
    padding: theme.spacing(1),
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
        <ListItem
          className={classes.teamItem}
          key={index}
          button
          component="a"
          href={"team/" + team.teamId}
        >
          <ListItemText
            primary={`${team.teamId} ${team.name}`}
            secondary={team.owner}
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

  const handleSubmit = () => {
    if (teamName.current === "") {
      showMessage("Empty name", true);
      return;
    }
    showLoading(true);
    blobContracts.TeamContract.methods
      .ClaimTeam(teamName.current, "")
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
      <Grid item xs={8}>
        <TextField
          id="team-name"
          className={classes.textField}
          placeholder="Team Name"
          margin="normal"
          onChange={(e) => (teamName.current = e.target.value)}
          variant="outlined"
          inputProps={{ "aria-label": "bare" }}
          fullWidth
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
  graph_client,
}) => {
  const [teams, setTeams] = useState([]);

  useEffect(() => {
    const getTeamList = () => {
      const teamListQuery = `
        query {
          teams{
            teamId,
            name,
            owner
          }
        }
      `;
      return graph_client
        .query({
          query: gql(teamListQuery),
        })
        .then((data) => data.data.teams)
        .catch((e) => showMessage(e.message, true));
    };
    const init = () => {
      setTitle("Teams");
      if (graph_client !== null) getTeamList().then((teams) => setTeams(teams));
    };
    init();
  }, [setTitle, showMessage, graph_client]);

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
