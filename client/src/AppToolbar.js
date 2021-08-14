import React, { useState, useEffect, Fragment } from "react";
import clsx from "clsx";

import { withStyles } from "@material-ui/core/styles";
import AppBar from "@material-ui/core/AppBar";
import Toolbar from "@material-ui/core/Toolbar";
import Typography from "@material-ui/core/Typography";
import Drawer from "@material-ui/core/Drawer";
import Fade from "@material-ui/core/Fade";
import Grid from "@material-ui/core/Grid";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListItemText from "@material-ui/core/ListItemText";
import IconButton from "@material-ui/core/IconButton";
import MenuIcon from "@material-ui/icons/Menu";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";

import ScheduleIcon from "@material-ui/icons/Schedule";
import TeamIcon from "@material-ui/icons/People";
import StandingIcon from "@material-ui/icons/FormatListNumbered";
import ManagementIcon from "@material-ui/icons/AccountBox";

import Schedules from "./Schedules";
import Teams from "./Teams";
import Standings from "./Standings";
import TeamManagement from "./TeamManagement";
import { getContractsAndAccount } from "./utils";

const AppToolbar = ({ classes, title, onMenuClick }) => {
  const [scrolling, setScrolling] = useState(false);

  useEffect(() => {
    const onScroll = (e) => {
      setScrolling(true);
    };
    window.addEventListener("scroll", onScroll);
    // clean up
    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    if (scrolling) {
      let timer1 = setTimeout(() => setScrolling(false), 1000);

      // this will clear Timeout
      // when component unmount like in willComponentUnmount
      return () => {
        clearTimeout(timer1);
      };
    }
  }, [scrolling]);

  return (
    <Fragment>
      <Fade in={!scrolling}>
        <AppBar position="fixed" className={classes.aboveDrawer}>
          <Toolbar>
            <IconButton
              className={classes.menuButton}
              color="inherit"
              aria-label="Menu"
              onClick={onMenuClick}
            >
              <MenuIcon />
            </IconButton>
            <Typography
              variant="inherit"
              color="inherit"
              className={classes.flex}
            >
              {title}
            </Typography>
          </Toolbar>
        </AppBar>
      </Fade>
      <div className={classes.toolbarMargin} />
    </Fragment>
  );
};

const menuStyles = (theme) => ({
  alignContent: {
    alignSelf: "center",
  },
  activeListItem: {
    color: theme.palette.primary.main,
  },
  toolbarMargin: theme.mixins.toolbar,
});

const NavListItem = withStyles(menuStyles)(
  ({ classes, Icon, text, active, ...other }) => (
    <ListItem button component="a" href={other.to} disabled={other.disabled}>
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

const MenuDrawer = withStyles(menuStyles)(
  ({ classes, variant, open, onClose, setTitle, toggleDrawer, teamId }) => (
    <Router>
      <Grid container justifyContent="space-between">
        <Grid item className={classes.alignContent}>
          <Route exact path="/">
            <Schedules setTitle={setTitle} />
          </Route>
          <Route exact path="/teams">
            <Teams setTitle={setTitle} />
          </Route>
          <Route exact path="/standings">
            <Standings setTitle={setTitle} />
          </Route>
          <Route exact path={"/team/:teamId"}>
            <TeamManagement setTitle={setTitle} />
          </Route>
        </Grid>
        <Grid item>
          <Drawer variant={variant} open={open} onClose={onClose}>
            <div className={classes.toolbarMargin} />
            <List>
              <NavItem
                to="/"
                text="Schedules"
                onClick={() => {
                  toggleDrawer();
                }}
                Icon={ScheduleIcon}
              />
              <NavItem
                to="/teams"
                text="Teams"
                onClick={() => {
                  toggleDrawer();
                }}
                Icon={TeamIcon}
              />
              <NavItem
                to="/standings"
                text="Standings"
                onClick={() => {
                  toggleDrawer();
                }}
                Icon={StandingIcon}
              />
              <NavItem
                to={"/team/" + teamId}
                text="My Team"
                onClick={() => {
                  toggleDrawer();
                }}
                Icon={ManagementIcon}
                disabled={teamId === null}
              />
            </List>
          </Drawer>
        </Grid>
      </Grid>
    </Router>
  )
);

const mainStyles = (theme) => ({
  aboveDrawer: {
    zIndex: theme.zIndex.drawer + 1,
  },
  root: {
    flexGrow: 1,
  },
  flex: {
    flex: 1,
  },
  menuButton: {
    marginLeft: -12,
    marginRight: 20,
  },
  toolbarMargin: theme.mixins.toolbar,
});

const AppBarInteraction = withStyles(mainStyles)(({ classes }) => {
  const [drawer, setDrawer] = useState(false);
  const [title, setTitle] = useState("Home");
  const [teamId, setTeamId] = useState(null);

  useEffect(() => {
    getContractsAndAccount().then((contractsAndAccount) => {
      const teamContract = contractsAndAccount.TeamContract;
      const currentUser = contractsAndAccount.Account;

      teamContract.methods
        .MyTeamId()
        .call({ from: currentUser })
        .then((id) => setTeamId(id))
        .catch((e) => setTeamId(null));
    });
  }, []);

  const toggleDrawer = () => {
    setDrawer(!drawer);
  };

  return (
    <div className={classes.root}>
      <AppToolbar classes={classes} title={title} onMenuClick={toggleDrawer} />
      <MenuDrawer
        variant="persistent"
        open={drawer}
        onClose={toggleDrawer}
        setTitle={setTitle}
        toggleDrawer={toggleDrawer}
        teamId={teamId}
      />
    </div>
  );
});

export default AppBarInteraction;
