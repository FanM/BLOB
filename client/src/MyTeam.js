import React from "react";
import clsx from "clsx";
import { withStyles } from "@material-ui/core/styles";
import {
  BrowserRouter as Router,
  Switch,
  Route,
  NavLink,
} from "react-router-dom";

import Drawer from "@material-ui/core/Drawer";
import Grid from "@material-ui/core/Grid";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListItemText from "@material-ui/core/ListItemText";
import Typography from "@material-ui/core/Typography";

import TeamIcon from "@material-ui/icons/PeopleAlt";
import ManagementIcon from "@material-ui/icons/Settings";
import TradeIcon from "@material-ui/icons/SwapHoriz";

import Players from "./Players";

const styles = (theme) => ({
  alignContent: {
    alignSelf: "right",
  },
  activeListItem: {
    color: theme.palette.primary.main,
  },
});

const NavListItem = withStyles(styles)(
  ({ classes, Icon, text, active, ...other }) => (
    <ListItem component={NavLink} {...other}>
      <ListItemIcon
        classes={{ root: clsx({ [classes.activeListItem]: active }) }}
      >
        <Icon />
      </ListItemIcon>
      <ListItemText
        classes={{ root: clsx({ [classes.activeListItem]: active }) }}
      >
        {text}
      </ListItemText>
    </ListItem>
  )
);

const NavItem = (props) => (
  <Switch>
    <Route
      exact
      path={props.to}
      render={() => <NavListItem active={true} {...props} />}
    />
    <Route path="/" render={() => <NavListItem {...props} />} />
  </Switch>
);

const MyTeam = ({ classes, toolbarMargin }) => {
  return (
    <Router>
      <Grid container justifyContent="space-between">
        <Grid item className={classes.alignContent}>
          <Route exact path="/players">
            <Players />
          </Route>
        </Grid>
        <Grid item>
          <Drawer variant="permanent">
            <div className={toolbarMargin} />
            <List>
              <NavItem to="/players" text="Players" Icon={TeamIcon} />
              <NavItem to="/teammgr" text="Management" Icon={ManagementIcon} />
              <NavItem to="/trade" text="Trade" Icon={TradeIcon} />
            </List>
          </Drawer>
        </Grid>
      </Grid>
    </Router>
  );
};

export default withStyles(styles)(MyTeam);
