import React, { useState, useEffect, Fragment } from "react";
import { gql } from "@apollo/client";
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
import Divider from "@material-ui/core/Divider";

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
    justifyContent: "center",
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
        <Fragment key={index}>
          <ListItem
            className={classes.teamItem}
            key={index}
            button
            component="a"
            href={"team/" + team.teamId}
          >
            <ListItemIcon>
              <Avatar>
                <TeamIcon />
              </Avatar>
            </ListItemIcon>
            <ListItemText primary={team.name} secondary={team.teamId} />
          </ListItem>
          <Divider variant="inset" component="li" />
        </Fragment>
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
  langObj,
}) => {
  const [teamName, setTeamName] = useState({
    id: "name",
    label: langObj.teams.CLAIM_TEAM_INPUT,
    value: "",
    error: false,
    helperText: langObj.teams.CLAIM_TEAM_INPUT_HELPER_TEXT,
    getHelperText: (error) =>
      error
        ? langObj.teams.CLAIM_TEAM_INPUT_ERROR
        : langObj.teams.CLAIM_TEAM_INPUT_HELPER_TEXT,
    isValid: (value) => /^[a-z0-9_]{4,10}$/i.test(value),
  });

  const onChange = ({ target: { id, value } }) => {
    const newTeamName = { ...teamName };
    const isValid = teamName.isValid(value);
    newTeamName.value = value;
    newTeamName.error = !isValid;
    newTeamName.helperText = teamName.getHelperText(!isValid);
    setTeamName(newTeamName);
  };

  const handleSubmit = () => {
    showLoading(true);
    blobContracts.TeamContract.methods
      .ClaimTeam(teamName.value, "")
      .send({ from: currentUser })
      .then(() => {
        showMessage(langObj.errorDesc.CONTRACT_OPERATION_SUCCEEDED);
        return blobContracts.TeamContract.methods.GetTeams().call();
      })
      .catch((e) =>
        showMessage(parseErrorCode(langObj.errorDesc, e.reason), true)
      )
      .then((teams) => setTeams(teams))
      .finally(() => showLoading(false));
  };

  return (
    <Grid container className={classes.container}>
      <Grid item>
        <TextField
          id={teamName.id}
          label={teamName.label}
          helperText={teamName.helperText}
          value={teamName.value}
          onChange={onChange}
          error={teamName.error}
          margin="normal"
          variant="outlined"
          className={classes.textField}
        />
      </Grid>

      <Grid item>
        <Button
          onClick={handleSubmit}
          disabled={!teamName.isValid(teamName.value)}
          color="primary"
        >
          {langObj.teams.CLAIM_TEAM_BUTTON}
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
  langObj,
}) => {
  const [teams, setTeams] = useState([]);

  useEffect(() => {
    const getTeamList = () => {
      const teamListQuery = `
        query {
          teams{
            teamId,
            name
          }
        }
      `;
      return graph_client
        .query({
          query: gql(teamListQuery),
        })
        .then((data) => data.data.teams);
    };
    const init = () => {
      setTitle(langObj.mainMenuItems.MAIN_MENU_TEAMS);
      if (graph_client !== null)
        getTeamList()
          .then((teams) => {
            if (teams) setTeams(teams);
            else showMessage("Network Error", true);
          })
          .catch((e) => showMessage(e.message, true));
    };
    init();
  }, [setTitle, showMessage, graph_client, langObj]);

  return (
    <div className={classes.root}>
      <ManagementTabContainer>
        <ManagmentTabContent label={langObj.mainMenuItems.MAIN_MENU_TEAMS}>
          <TeamList classes={classes} teams={teams} setTitle={setTitle} />
        </ManagmentTabContent>
        <ManagmentTabContent
          disabled={currentUser === null}
          label={langObj.teams.CLAIM_TEAM_TAB}
        >
          <ClaimTeam
            classes={classes}
            blobContracts={blobContracts}
            currentUser={currentUser}
            setTeams={setTeams}
            showMessage={showMessage}
            showLoading={showLoading}
            langObj={langObj}
          />
        </ManagmentTabContent>
      </ManagementTabContainer>
    </div>
  );
};
export default withWidth()(withStyles(styles)(TeamsBar));
