import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import compose from "recompose/compose";
import { gql } from "@apollo/client";
import { withStyles } from "@material-ui/core/styles";
import withWidth from "@material-ui/core/withWidth";
import Card from "@material-ui/core/Card";
import CardHeader from "@material-ui/core/CardHeader";
import CardContent from "@material-ui/core/CardContent";
import Grid from "@material-ui/core/Grid";
import Typography from "@material-ui/core/Typography";
import Avatar from "@material-ui/core/Avatar";

import TeamIcon from "@material-ui/icons/People";

import { ManagementTabContainer, ManagmentTabContent } from "./AbstractTabs";
import Players from "./Players";
import RosterManagement from "./RosterManagement";

const styles = (theme) => ({
  root: {
    backgroundColor: theme.palette.background.paper,
  },
  card: {
    flexGrow: 1,
    margin: theme.spacing(0),
    marginBottom: theme.spacing(1),
    padding: theme.spacing(-1),
  },
  text: {
    margin: theme.spacing(1),
    marginBottom: theme.spacing(1),
    color: theme.palette.text.secondary,
  },
});

const TeamManagementBar = ({
  classes,
  width,
  myTeamId,
  matchRound,
  setTitle,
  showMessage,
  showLoading,
  blobContracts,
  currentUser,
  graph_client,
}) => {
  let { teamId } = useParams();
  let [teamInfo, setTeamInfo] = useState({ joinedSeason: "" });

  useEffect(() => {
    const getTeamInfo = () => {
      const teamListQuery = `
        query{
          teams(where: {teamId: ${teamId}}){
            teamId,
            name,
            owner,
            joinedSeason {
              seasonId
            },
            champions
          }
        }
      `;
      return graph_client
        .query({
          query: gql(teamListQuery),
        })
        .then((data) => data.data.teams[0])
        .catch((e) => showMessage(e.message, true));
    };
    if (graph_client !== null) getTeamInfo().then((team) => setTeamInfo(team));
  }, [showMessage, teamId, graph_client]);

  useEffect(() => setTitle(teamInfo.name), [setTitle, teamInfo.name]);

  return (
    <div className={classes.root}>
      <Card elevation={3} className={classes.card}>
        <CardHeader
          title={teamInfo.name}
          subheader={teamInfo.teamId}
          avatar={
            <Avatar>
              <TeamIcon />
            </Avatar>
          }
        />
        <CardContent>
          <Grid container justifyContent="flex-start">
            <Grid item xs={6}>
              <Typography className={classes.text}>
                Joined Season: <strong>{teamInfo.joinedSeason.seasonId}</strong>
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography className={classes.text}>
                Total Champions: <strong>{teamInfo.champions}</strong>
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body2" className={classes.text}>
                Owner: {teamInfo.owner}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
      <ManagementTabContainer>
        <ManagmentTabContent label="Players">
          <Players
            teamId={teamId}
            showMessage={showMessage}
            graph_client={graph_client}
          />
        </ManagmentTabContent>
        <ManagmentTabContent
          disabled={currentUser === null}
          label="Roster Management"
        >
          <RosterManagement
            teamId={teamId}
            matchRound={matchRound}
            showMessage={showMessage}
            showLoading={showLoading}
            blobContracts={blobContracts}
            currentUser={currentUser}
            graph_client={graph_client}
          />
        </ManagmentTabContent>
      </ManagementTabContainer>
    </div>
  );
};

export default compose(withWidth(), withStyles(styles))(TeamManagementBar);
