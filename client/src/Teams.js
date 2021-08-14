import React, { useState, useEffect, useRef } from "react";
import { withStyles } from "@material-ui/core/styles";
import withWidth from "@material-ui/core/withWidth";
import Avatar from "@material-ui/core/Avatar";
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import ListItemIcon from "@material-ui/core/ListItemIcon";

import TeamIcon from "@material-ui/icons/People";

import { getContractsAndAccount, parseErrorCode } from "./utils";
import { ManagementTabContainer, ManagmentTabContent } from "./AbstractTabs";

const styles = (theme) => ({
  container: {
    display: "flex",
    flexWrap: "wrap",
  },
  textField: {
    marginLeft: theme.spacing(1),
    marginRight: theme.spacing(1),
  },
  paper: {
    padding: theme.spacing(2),
    textAlign: "center",
    color: theme.palette.text.secondary,
  },
});

const TeamList = ({ classes, teams, setTitle }) => (
  <div className="list-teams-container">
    <List>
      {teams.map((team, index) => (
        <ListItem
          key={team.id}
          button
          component="a"
          href={"team/" + team.id}
          dense
        >
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
}) => {
  const teamName = useRef(null);
  const imageUrl = useRef(null);

  const handleSubmit = async () => {
    const imageURL = imageUrl;

    await teamContract.current.methods
      .ClaimTeam(teamName.current, imageURL.current)
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
    <div className="claim-team-container">
      <label>Name</label>
      <TextField
        id="team-name"
        className={classes.textField}
        placeholder="Team Name"
        margin="normal"
        onChange={(e) => (teamName.current = e.target.value)}
        variant="outlined"
        inputProps={{ "aria-label": "bare" }}
      />

      <label>Logo</label>
      <TextField
        id="team-logo"
        className={classes.textField}
        placeholder="Team Logo"
        margin="normal"
        onChange={(e) => (imageUrl.current = e.target.value)}
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
  );
};

const TeamsBar = ({ classes, width, setTitle }) => {
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
      <ManagementTabContainer width={width}>
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
          />
        </ManagmentTabContent>
      </ManagementTabContainer>
    </div>
  );
};
export default withWidth()(withStyles(styles)(TeamsBar));
