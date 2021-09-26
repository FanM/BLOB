import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  Fragment,
} from "react";
import clsx from "clsx";
import { gql } from "@apollo/client";

import {
  withStyles,
  createTheme,
  MuiThemeProvider,
} from "@material-ui/core/styles";
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

import indigo from "@material-ui/core/colors/indigo";
import orange from "@material-ui/core/colors/orange";
import red from "@material-ui/core/colors/red";

import MenuIcon from "@material-ui/icons/Menu";
import ScheduleIcon from "@material-ui/icons/EventNote";
import TeamIcon from "@material-ui/icons/People";
import StandingIcon from "@material-ui/icons/FormatListNumbered";
import ManagementIcon from "@material-ui/icons/AccountBox";
import DraftIcon from "@material-ui/icons/GroupAdd";
import StatsIcon from "@material-ui/icons/BarChart";
import TradeIcon from "@material-ui/icons/SwapHoriz";
import BasketballIcon from "@material-ui/icons/SportsBasketball";

import Schedules from "./Schedules";
import Teams from "./Teams";
import Standings from "./Standings";
import TeamManagement from "./TeamManagement";
import Draft from "./Draft";
import Trade from "./Trade";
import Admin from "./Admin";
import MatchStats from "./MatchStats";
import LeagueStats from "./LeagueStats";
import PlayerProfile from "./PlayerProfile";
import LoadingDialog from "./LoadingDialog";
import { initContractsAndAccount, getSubgraphClient } from "./utils";

import BackgroundImage from "./img/background.jpg";

const AppToolbar = ({
  classes,
  title,
  connected,
  onMenuClick,
  onLogoClick,
}) => {
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
        <AppBar position="fixed" className={classes.appbar}>
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
              <IconButton
                onClick={onLogoClick}
                color={connected ? "inherit" : "secondary"}
              >
                <Grid container direction="row" alignItems="center">
                  <Grid item>
                    <BasketballIcon />
                  </Grid>
                  <Grid item>
                    <Typography>blob</Typography>
                  </Grid>
                </Grid>
              </IconButton>
            </section>
          </Toolbar>
        </AppBar>
      </Fade>
      <div className={classes.toolbarMargin} />
    </Fragment>
  );
};

const menuStyles = (theme) => ({
  container: {
    justifyContent: "center",
    opacity: 0.9,
  },
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
    graph_client,
    season,
  }) => (
    <Router>
      <Grid container className={classes.container}>
        <Grid item className={classes.alignContent}>
          <Route exact path="/">
            <Schedules
              season={season}
              setTitle={setTitle}
              showMessage={showMessage}
              blobContracts={blobContracts}
              graph_client={graph_client}
            />
          </Route>
          <Route exact path="/teams">
            <Teams
              setTitle={setTitle}
              showMessage={showMessage}
              showLoading={showLoading}
              blobContracts={blobContracts}
              currentUser={currentUser}
              graph_client={graph_client}
            />
          </Route>
          <Route exact path="/standings">
            <Standings
              seasonId={season.seasonId}
              setTitle={setTitle}
              showMessage={showMessage}
              graph_client={graph_client}
            />
          </Route>
          <Route exact path={"/team/:teamId"}>
            <TeamManagement
              myTeamId={myTeamId}
              matchRound={season.matchRound}
              setTitle={setTitle}
              showMessage={showMessage}
              showLoading={showLoading}
              blobContracts={blobContracts}
              currentUser={currentUser}
              graph_client={graph_client}
            />
          </Route>
          <Route exact path={"/match/:seasonId/:matchId"}>
            <MatchStats
              setTitle={setTitle}
              showMessage={showMessage}
              graph_client={graph_client}
            />
          </Route>
          <Route exact path={"/player/:playerId"}>
            <PlayerProfile
              seasonId={season.seasonId}
              setTitle={setTitle}
              showMessage={showMessage}
              graph_client={graph_client}
            />
          </Route>
          <Route exact path={"/stats"}>
            <LeagueStats
              season={season}
              setTitle={setTitle}
              showMessage={showMessage}
              graph_client={graph_client}
            />
          </Route>
          <Route exact path={"/trade"}>
            <Trade
              myTeamId={myTeamId}
              setTitle={setTitle}
              showMessage={showMessage}
              showLoading={showLoading}
              graph_client={graph_client}
              blobContracts={blobContracts}
              currentUser={currentUser}
            />
          </Route>
          <Route exact path="/draft">
            <Draft
              setTitle={setTitle}
              myTeamId={myTeamId}
              seasonState={season.seasonState}
              showMessage={showMessage}
              showLoading={showLoading}
              blobContracts={blobContracts}
              currentUser={currentUser}
            />
          </Route>
          <Route exact path="/admin">
            <Admin
              setTitle={setTitle}
              seasonState={season.seasonState}
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
              <NavItem to="/stats" text="Player Stats" Icon={StatsIcon} />
              <NavItem to="/draft" text="Draft" Icon={DraftIcon} />
              <NavItem to="/trade" text="Trade" Icon={TradeIcon} />
              <NavItem
                to={"/team/" + myTeamId}
                text="My Team"
                Icon={ManagementIcon}
                disabled={myTeamId === null}
              />
            </List>
          </Drawer>
        </Grid>
      </Grid>
    </Router>
  )
);

const mainStyles = (theme) => ({
  root: {
    backgroundImage: `url(${BackgroundImage})`,
    minHeight: "100vh",
    backgroudRepeat: "no-repeat",
    backgroundAttachment: "fixed",
    backgroundPosition: "center",
    backgroundSize: "cover",
  },
  appbar: {
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
  const [graphClient, setGraphClient] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [drawer, setDrawer] = useState(false);
  const [title, setTitle] = useState("");
  const [myTeamId, setMyTeamId] = useState(null);
  const [season, setSeason] = useState({});
  const [message, setMessage] = useState(["", false]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const darkTheme = createTheme({
    palette: {
      type: "light",
      primary: indigo,
      secondary: orange,
      error: { main: red[600] },
    },
  });

  const showMessage = useCallback((message, error = false) => {
    setMessage([message, error]);
    setOpen(true);
  }, []);

  useEffect(() => {
    const updateSeasonInfo = () => {
      const querySeasonInfo = `
        query {
          seasons(orderBy: seasonId, orderDirection: desc, first: 1) {
            seasonId,
            seasonState,
            matchRound
          }
        }
      `;
      return graphClient
        .query({
          query: gql(querySeasonInfo),
        })
        .then((data) => data.data.seasons[0]);
    };

    if (graphClient !== null) {
      updateSeasonInfo()
        .then((season) => {
          if (season !== undefined) setSeason(season);
        })
        .catch((e) => showMessage(e.message, true));
    }
  }, [graphClient, showMessage]);

  useEffect(() => {
    if (blobContracts.current !== null)
      blobContracts.current.TeamContract.methods
        .MyTeamId()
        .call({ from: currentUser })
        .then((id) => setMyTeamId(id))
        .catch((e) => setMyTeamId(null));
  }, [currentUser]);

  const connectWallet = useCallback(
    () =>
      initContractsAndAccount().then((contracts) => {
        contracts.Provider.on("accountsChanged", (accounts) => {
          setCurrentUser(accounts[0]);
        });
        localStorage.setItem("wallet_connected", true);
        blobContracts.current = contracts;
        setCurrentUser(contracts.Account);
      }),
    []
  );

  const handleManualtConnect = () =>
    connectWallet().catch((e) => showMessage(e.message, true));

  const handleAutomaticConnect = useCallback(() => {
    connectWallet().catch((e) => {
      localStorage.setItem("wallet_connected", false);
    });
  }, [connectWallet]);

  useEffect(() => {
    const init = async () => {
      const walletConnected =
        localStorage.getItem("wallet_connected") || "false";
      if (JSON.parse(walletConnected)) await handleAutomaticConnect();
      setGraphClient(getSubgraphClient());
    };
    init();
  }, [handleAutomaticConnect]);

  const toggleDrawer = useCallback(
    (e) => {
      setDrawer(!drawer);
    },
    [drawer]
  );

  const showLoading = useCallback((loading) => setLoading(loading), []);

  const setPageTitle = useCallback((s) => setTitle(s), []);

  return (
    <div className={classes.root}>
      <MuiThemeProvider theme={darkTheme}>
        <AppToolbar
          classes={classes}
          title={title}
          connected={currentUser !== null}
          onMenuClick={toggleDrawer}
          onLogoClick={handleManualtConnect}
        />
        <MenuDrawer
          variant="temporary"
          open={drawer}
          setTitle={setPageTitle}
          toggleDrawer={toggleDrawer}
          showMessage={showMessage}
          showLoading={showLoading}
          myTeamId={myTeamId}
          season={season}
          blobContracts={blobContracts.current}
          currentUser={currentUser}
          graph_client={graphClient}
        />
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
      </MuiThemeProvider>
    </div>
  );
});

export default AppBarInteraction;
