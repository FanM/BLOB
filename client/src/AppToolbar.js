import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  Fragment,
} from "react";
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
import Snackbar from "@material-ui/core/Snackbar";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";

import MenuIcon from "@material-ui/icons/Menu";
import ScheduleIcon from "@material-ui/icons/EventNote";
import TeamIcon from "@material-ui/icons/People";
import StandingIcon from "@material-ui/icons/FormatListNumbered";
import ManagementIcon from "@material-ui/icons/AccountBox";
import DraftIcon from "@material-ui/icons/GroupAdd";
import AdminIcon from "@material-ui/icons/SupervisedUserCircle";
import LogoIcon from "@material-ui/icons/SportsBasketball";

import Schedules from "./Schedules";
import Teams from "./Teams";
import Standings from "./Standings";
import TeamManagement from "./TeamManagement";
import Draft from "./Draft";
import Admin from "./Admin";
import MatchStats from "./MatchStats";
import LoadingDialog from "./LoadingDialog";
import { initContractsAndAccount } from "./utils";

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
            <section className={classes.logo}>
              <Grid container href="/" direction="row" alignItems="center">
                <Grid item>
                  <LogoIcon />
                </Grid>
                <Grid item>blob</Grid>
              </Grid>
            </section>
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
    flexGrow: 1,
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
  ({
    classes,
    variant,
    open,
    setTitle,
    toggleDrawer,
    showMessage,
    showLoading,
    myTeamId,
    seasonState,
    blobContracts,
    currentUser,
  }) => (
    <Router>
      <Grid container justifyContent="center">
        <Grid item className={classes.alignContent}>
          <Route exact path="/">
            <Schedules
              setTitle={setTitle}
              seasonState={seasonState}
              blobContracts={blobContracts}
            />
          </Route>
          <Route exact path="/teams">
            <Teams
              setTitle={setTitle}
              showMessage={showMessage}
              showLoading={showLoading}
              blobContracts={blobContracts}
              currentUser={currentUser}
            />
          </Route>
          <Route exact path="/standings">
            <Standings setTitle={setTitle} blobContracts={blobContracts} />
          </Route>
          <Route exact path={"/team/:teamId"}>
            <TeamManagement
              myTeamId={myTeamId}
              setTitle={setTitle}
              showMessage={showMessage}
              showLoading={showLoading}
              blobContracts={blobContracts}
              currentUser={currentUser}
            />
          </Route>
          <Route exact path={"/match/:seasonId/:matchId"}>
            <MatchStats setTitle={setTitle} showMessage={showMessage} />
          </Route>
          <Route exact path="/draft">
            <Draft
              setTitle={setTitle}
              myTeamId={myTeamId}
              seasonState={seasonState}
              showMessage={showMessage}
              showLoading={showLoading}
              blobContracts={blobContracts}
              currentUser={currentUser}
            />
          </Route>
          <Route exact path="/admin">
            <Admin
              setTitle={setTitle}
              seasonState={seasonState}
              showMessage={showMessage}
              showLoading={showLoading}
              blobContracts={blobContracts}
              currentUser={currentUser}
            />
          </Route>
        </Grid>
        <Grid item>
          <Drawer
            variant={variant}
            open={open}
            onClose={(e, reason) => {
              toggleDrawer();
            }}
          >
            <List>
              <NavItem to="/" text="Schedules" Icon={ScheduleIcon} />
              <NavItem to="/teams" text="Teams" Icon={TeamIcon} />
              <NavItem to="/standings" text="Standings" Icon={StandingIcon} />
              <NavItem to="/draft" text="Draft" Icon={DraftIcon} />
              <NavItem
                to={"/team/" + myTeamId}
                text="My Team"
                Icon={ManagementIcon}
                disabled={myTeamId === null}
              />
              <NavItem to="/admin" text="Admin" Icon={AdminIcon} />
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
  flex: {
    flex: 1,
  },
  menuButton: {
    marginLeft: -12,
    marginRight: 20,
  },
  logo: {
    marginLeft: "auto",
    marginRight: 12,
  },
  toolbarMargin: theme.mixins.toolbar,
  errorMsg: {
    backgroundColor: theme.palette.error.main,
    color: theme.palette.error.contrastText,
  },
  successMsg: {
    backgroundColor: theme.palette.success.main,
    color: theme.palette.success.contrastText,
  },
});

const AppBarInteraction = withStyles(mainStyles)(({ classes }) => {
  const blobContracts = useRef(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [drawer, setDrawer] = useState(false);
  const [title, setTitle] = useState("Home");
  const [myTeamId, setMyTeamId] = useState(null);
  const [seasonState, setSeasonState] = useState(3);
  const [message, setMessage] = useState(["", false]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const showMessage = useCallback((message, error = false) => {
    setMessage([message, error]);
    setOpen(true);
  }, []);

  useEffect(() => {
    if (blobContracts.current !== null)
      blobContracts.current.TeamContract.methods
        .MyTeamId()
        .call({ from: currentUser })
        .then((id) => setMyTeamId(id))
        .catch((e) => setMyTeamId(null))
        .then(() =>
          blobContracts.current.SeasonContract.methods
            .seasonState()
            .call()
            .then((s) => setSeasonState(s))
        );
  }, [currentUser]);

  useEffect(() => {
    initContractsAndAccount()
      .then((contracts) => {
        window.ethereum.on("accountsChanged", (accounts) => {
          setCurrentUser(accounts[0]);
        });
        blobContracts.current = contracts;
        setCurrentUser(contracts.Account);
      })
      .catch((e) => showMessage(e.message, true));
  }, [showMessage]);

  const toggleDrawer = useCallback(
    (e) => {
      setDrawer(!drawer);
    },
    [drawer]
  );

  const showLoading = useCallback((loading) => setLoading(loading), []);

  const setPageTitle = useCallback((s) => setTitle(s), []);

  return (
    <Fragment>
      <AppToolbar classes={classes} title={title} onMenuClick={toggleDrawer} />
      {blobContracts.current !== null && (
        <MenuDrawer
          variant="temporary"
          open={drawer}
          setTitle={setPageTitle}
          toggleDrawer={toggleDrawer}
          showMessage={showMessage}
          showLoading={showLoading}
          myTeamId={myTeamId}
          seasonState={seasonState}
          blobContracts={blobContracts.current}
          currentUser={currentUser}
        />
      )}
      <Snackbar
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        open={open}
        onClose={() => setOpen(false)}
        autoHideDuration={5000}
        transaction="slide"
        direction="right"
        message={message[0]}
        ContentProps={
          message[1]
            ? { classes: { root: classes.errorMsg } }
            : { classes: { root: classes.successMsg } }
        }
      />
      <LoadingDialog open={loading} />
    </Fragment>
  );
});

export default AppBarInteraction;
