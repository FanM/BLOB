import React, { useState } from "react";
import { BrowserRouter as Router, Route, Link } from "react-router-dom";

import Drawer from "@material-ui/core/Drawer";
import Grid from "@material-ui/core/Grid";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListItemText from "@material-ui/core/ListItemText";

import TeamIcon from "@material-ui/icons/PeopleAlt";
import ManagementIcon from "@material-ui/icons/Settings";
import TradeIcon from "@material-ui/icons/SwapHoriz";

import Players from "./Players";

const MyTeam = ({ classes, variant }) => {
  const [open, setOpen] = useState(false);

  return (
    <Grid container justifyContent="space-between">
      <Grid item>
        <Router>
          <Drawer variant={variant} open={open} onClose={() => setOpen(false)}>
            <div className={classes.toolbarMargin} />
            <List>
              <ListItem
                component={Link}
                to="/players"
                onClick={() => setOpen(false)}
              >
                <ListItemIcon>
                  <TeamIcon />
                </ListItemIcon>
                <ListItemText>Players</ListItemText>
              </ListItem>
              <ListItem button onClick={() => setOpen(false)}>
                <ListItemIcon>
                  <ManagementIcon />
                </ListItemIcon>
                <ListItemText>Management</ListItemText>
              </ListItem>
              <ListItem button onClick={() => setOpen(false)}>
                <ListItemIcon>
                  <TradeIcon />
                </ListItemIcon>
                <ListItemText>Trade</ListItemText>
              </ListItem>
            </List>
          </Drawer>
          <Route exact path="/players">
            <Players />
          </Route>
        </Router>
      </Grid>
    </Grid>
  );
};

export default MyTeam;
