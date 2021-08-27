import React, { useEffect } from "react";
import { useParams } from "react-router-dom";
import compose from "recompose/compose";
import { withStyles } from "@material-ui/core/styles";
import withWidth from "@material-ui/core/withWidth";

import { ManagementTabContainer, ManagmentTabContent } from "./AbstractTabs";
import Players from "./Players";
import RosterManagement from "./RosterManagement";
import Trade from "./Trade";

const styles = (theme) => ({
  root: {
    flexGrow: 1,
    backgroundColor: theme.palette.background.paper,
  },
});

const TeamManagementBar = ({
  classes,
  width,
  myTeamId,
  setTitle,
  showMessage,
  showLoading,
}) => {
  let { teamId } = useParams();

  useEffect(() => {
    setTitle("Team " + teamId);
  }, [setTitle, teamId]);

  return (
    <div className={classes.root}>
      <ManagementTabContainer>
        <ManagmentTabContent label="Players">
          <Players teamId={teamId} showMessage={showMessage} />
        </ManagmentTabContent>
        <ManagmentTabContent label="Roster Management">
          <RosterManagement
            teamId={teamId}
            showMessage={showMessage}
            showLoading={showLoading}
          />
        </ManagmentTabContent>
        <ManagmentTabContent disabled={teamId !== myTeamId} label="Trade">
          <Trade
            myTeamId={myTeamId}
            showMessage={showMessage}
            showLoading={showLoading}
          />
        </ManagmentTabContent>
      </ManagementTabContainer>
    </div>
  );
};

export default compose(withWidth(), withStyles(styles))(TeamManagementBar);
