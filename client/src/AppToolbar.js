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
import Badge from "@material-ui/core/Badge";
import Menu from "@material-ui/core/Menu";
import MenuItem from "@material-ui/core/MenuItem";
import { HashRouter as Router, Switch, Route } from "react-router-dom";
import { LinkContainer } from "react-router-bootstrap";

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
import LanguageIcon from "@material-ui/icons/Translate";
import AboutIcon from "@material-ui/icons/Info";

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
import About from "./About";
import LoadingDialog from "./LoadingDialog";
import { initContractsAndAccount, getSubgraphClient } from "./utils";
import { languages } from "./env.json";

import BackgroundImage from "./img/background.jpg";

const AppToolbar = ({
  classes,
  title,
  connected,
  onMenuClick,
  onLogoClick,
  onLanguageSelect,
}) => {
  const [scrolling, setScrolling] = useState(false);
  const [langEl, setLangEl] = useState(null);
  const langOpen = Boolean(langEl);

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

  const handleLangClick = (event) => {
    setLangEl(event.currentTarget);
  };

  const handleLangClose = () => {
    setLangEl(null);
  };

  const onLangSelect = (index) => {
    setLangEl(null);
    onLanguageSelect(index);
  };

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
            <IconButton
              className={classes.langIcon}
              color="inherit"
              onClick={handleLangClick}
            >
              <LanguageIcon />
            </IconButton>
            <Menu
              id="lang-menu"
              anchorEl={langEl}
              keepMounted
              open={langOpen}
              onClose={handleLangClose}
            >
              {languages.map((lang, index) => (
                <MenuItem
                  key={index}
                  selected={index === 0}
                  onClick={() => onLangSelect(index)}
                >
                  {lang.name}
                </MenuItem>
              ))}
            </Menu>
            <section className={classes.logo}>
              <Badge
                badgeContent={<em>beta</em>}
                overlap="circular"
                className={classes.betaLogo}
                color="error"
              >
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
              </Badge>
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
  menuItemText: {
    marginLeft: theme.spacing(-1),
  },
});

const NavListItem = withStyles(menuStyles)(
  ({ classes, Icon, text, active, ...other }) => (
    <LinkContainer to={other.to}>
      <ListItem button disabled={other.disabled} onClick={other.toggleDrawer}>
        <ListItemIcon
          classes={{ root: clsx({ [classes.activeListItem]: active }) }}
        >
          <Icon />
        </ListItemIcon>
        <ListItemText
          classes={{ root: clsx({ [classes.activeListItem]: active }) }}
          className={classes.menuItemText}
        >
          {text}
        </ListItemText>
      </ListItem>
    </LinkContainer>
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
    langObj,
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
              langObj={langObj}
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
              langObj={langObj}
            />
          </Route>
          <Route exact path="/standings">
            <Standings
              seasonId={season.seasonId}
              setTitle={setTitle}
              showMessage={showMessage}
              graph_client={graph_client}
              langObj={langObj}
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
              langObj={langObj}
            />
          </Route>
          <Route exact path={"/match/:seasonId/:matchId"}>
            <MatchStats
              setTitle={setTitle}
              showMessage={showMessage}
              graph_client={graph_client}
              langObj={langObj}
            />
          </Route>
          <Route exact path={"/player/:playerId"}>
            <PlayerProfile
              seasonId={season.seasonId}
              setTitle={setTitle}
              showMessage={showMessage}
              showLoading={showLoading}
              blobContracts={blobContracts}
              currentUser={currentUser}
              graph_client={graph_client}
              langObj={langObj}
            />
          </Route>
          <Route exact path={"/stats"}>
            <LeagueStats
              seasonId={season.seasonId}
              setTitle={setTitle}
              showMessage={showMessage}
              graph_client={graph_client}
              langObj={langObj}
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
              langObj={langObj}
            />
          </Route>
          <Route exact path="/draft">
            <Draft
              setTitle={setTitle}
              myTeamId={myTeamId}
              season={season}
              showMessage={showMessage}
              showLoading={showLoading}
              graph_client={graph_client}
              blobContracts={blobContracts}
              currentUser={currentUser}
              langObj={langObj}
            />
          </Route>
          <Route exact path="/about">
            <About setTitle={setTitle} langObj={langObj} />
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
              <NavItem
                to="/"
                text={langObj.mainMenuItems.MAIN_MENU_SCHEDULES}
                Icon={ScheduleIcon}
                toggleDrawer={toggleDrawer}
              />
              <NavItem
                to="/teams"
                text={langObj.mainMenuItems.MAIN_MENU_TEAMS}
                Icon={TeamIcon}
                toggleDrawer={toggleDrawer}
              />
              <NavItem
                to="/standings"
                text={langObj.mainMenuItems.MAIN_MENU_STANDINGS}
                Icon={StandingIcon}
                toggleDrawer={toggleDrawer}
              />
              <NavItem
                to="/stats"
                text={langObj.mainMenuItems.MAIN_MENU_PLAYER_STATS}
                Icon={StatsIcon}
                toggleDrawer={toggleDrawer}
              />
              <NavItem
                to="/draft"
                text={langObj.mainMenuItems.MAIN_MENU_DRAFT}
                Icon={DraftIcon}
                toggleDrawer={toggleDrawer}
              />
              <NavItem
                to="/trade"
                text={langObj.mainMenuItems.MAIN_MENU_TRADE}
                Icon={TradeIcon}
                toggleDrawer={toggleDrawer}
              />
              <NavItem
                to={"/team/" + myTeamId}
                text={langObj.mainMenuItems.MAIN_MENU_MY_TEAM}
                Icon={ManagementIcon}
                disabled={myTeamId === null}
                toggleDrawer={toggleDrawer}
              />
              <NavItem
                to="/about/"
                text={langObj.mainMenuItems.MAIN_MENU_ABOUT}
                Icon={AboutIcon}
                toggleDrawer={toggleDrawer}
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
    marginLeft: theme.spacing(-1),
    marginRight: theme.spacing(2),
  },
  langIcon: {
    marginLeft: "auto",
    marginRight: theme.spacing(-2),
  },
  logo: {
    marginLeft: "auto",
    marginRight: theme.spacing(1),
  },
  betaLogo: {
    marginTop: theme.spacing(1),
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
  const [langObj, setLangObj] = useState(null);
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

  const handleManualConnect = () =>
    connectWallet().catch((e) => showMessage(e.message, true));

  const handleAutomaticConnect = useCallback(() => {
    connectWallet().catch((e) => {
      localStorage.setItem("wallet_connected", false);
    });
  }, [connectWallet]);

  const loadLanguage = useCallback(() => {
    const langIndex = localStorage.getItem("lang") || 0;
    localStorage.setItem("lang", langIndex);
    // assign to a local variable to avoid reference undefined after npm build
    const langObjects = languages;
    import(`${langObjects[langIndex].file}`).then((lang) => setLangObj(lang));
  }, []);

  const setLanguage = useCallback((index) => {
    localStorage.setItem("lang", index);
    // assign to a local variable to avoid reference undefined after npm build
    const langObjects = languages;
    import(`${langObjects[index].file}`).then((lang) => setLangObj(lang));
  }, []);

  useEffect(() => {
    const init = async () => {
      const walletConnected =
        localStorage.getItem("wallet_connected") || "false";
      if (JSON.parse(walletConnected)) await handleAutomaticConnect();
      setGraphClient(getSubgraphClient());
      loadLanguage();
    };
    init();
  }, [handleAutomaticConnect, loadLanguage]);

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
          onLogoClick={handleManualConnect}
          onLanguageSelect={setLanguage}
        />
        {langObj !== null && (
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
            langObj={langObj}
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
        {langObj !== null && (
          <LoadingDialog
            open={loading}
            message={langObj.dialog.DIALOG_WAITING_CONFIRMATION_MESSAGE}
          />
        )}
      </MuiThemeProvider>
    </div>
  );
});

export default AppBarInteraction;
