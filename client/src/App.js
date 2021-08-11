import React, { Fragment, useState, useEffect } from "react";
import { makeStyles } from "@material-ui/core/styles";
import AppBar from "@material-ui/core/AppBar";
import Toolbar from "@material-ui/core/Toolbar";
import Typography from "@material-ui/core/Typography";
import Button from "@material-ui/core/Button";
import IconButton from "@material-ui/core/IconButton";
import Fade from "@material-ui/core/Fade";
import MenuIcon from "@material-ui/icons/Menu";
import Menu from "@material-ui/core/Menu";
import MenuItem from "@material-ui/core/MenuItem";
import { BrowserRouter as Router, Route, Link } from "react-router-dom";

import Schedules from "./Schedules";
import Teams from "./Teams";
import Standings from "./Standings";
import MyTeam from "./MyTeam";

import "./App.css";

const useStyles = makeStyles((theme) => ({
  root: {
    flexGrow: 1,
  },
  appBar: {
    zIndex: theme.zIndex.drawer + 1,
  },
  flex: {
    flex: 1,
  },
  menuButton: {
    marginLeft: -12,
    marginRight: 20,
  },
  toolbarMargin: theme.mixins.toolbar,
}));

const App = () => {
  const classes = useStyles();
  const [scrolling, setScrolling] = useState(false);
  const [anchor, setAnchor] = useState(null);

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

  const MenuItems = React.forwardRef((props, ref) => (
    <Fragment>
      <MenuItem ref={ref} onClick={closeMenuFunc} component={Link} to="/">
        Schedules
      </MenuItem>
      <MenuItem ref={ref} onClick={closeMenuFunc} component={Link} to="/teams">
        Teams
      </MenuItem>
      <MenuItem ref={ref} onClick={closeMenuFunc} component={Link} to="/myteam">
        My Team
      </MenuItem>
      <MenuItem
        ref={ref}
        onClick={closeMenuFunc}
        component={Link}
        to="/standings"
      >
        Standings
      </MenuItem>
    </Fragment>
  ));

  const RightButton = () => (
    <Button color="secondary" variant="contained">
      Login
    </Button>
  );

  const closeMenuFunc = () => setAnchor(null);

  return (
    <div className={classes.root}>
      <Router>
        <Fade in={!scrolling}>
          <AppBar position="fixed" className={classes.appBar}>
            <Toolbar>
              <IconButton
                className={classes.menuButton}
                color="inherit"
                aria-label="Menu"
                onClick={(e) => setAnchor(e.currentTarget)}
              >
                <MenuIcon />
              </IconButton>
              <Menu
                anchorEl={anchor}
                open={Boolean(anchor)}
                onClose={closeMenuFunc}
              >
                <MenuItems closeMenu={closeMenuFunc} />
              </Menu>
              <Typography
                variant="inherit"
                color="inherit"
                className={classes.flex}
              >
                BLOB
              </Typography>
              <RightButton />
            </Toolbar>
          </AppBar>
        </Fade>
        <div className={classes.toolbarMargin} />
        <Route exact path="/">
          <Schedules />
        </Route>
        <Route exact path="/teams">
          <Teams />
        </Route>
        <Route exact path="/standings">
          <Standings />
        </Route>
        <Route exact path="/myteam">
          <MyTeam variant="permanent" classes={classes} />
        </Route>
      </Router>
    </div>
  );
};

export default App;
