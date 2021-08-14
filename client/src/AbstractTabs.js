import React, { Fragment, Children, useState } from "react";

import { withStyles } from "@material-ui/core/styles";
import AppBar from "@material-ui/core/AppBar";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";
import Typography from "@material-ui/core/Typography";

const styles = (theme) => ({
  tabContent: {
    padding: theme.spacing(2),
  },
});

const ManagementTabContainer = ({ children, width }) => {
  const [value, setValue] = useState(0);

  const onChange = (e, value) => {
    setValue(value);
  };

  return (
    <Fragment>
      <AppBar color="inherit" position="static">
        <Tabs
          value={value}
          onChange={onChange}
          variant={["xs", "sm"].includes(width) ? null : "fullWidth"}
        >
          {Children.map(children, (child) => (
            <Tab label={child.props.label} />
          ))}
        </Tabs>
      </AppBar>
      {Children.map(children, (child, index) =>
        index === value ? child : null
      )}
    </Fragment>
  );
};

const ManagmentTabContent = withStyles(styles)(({ classes, children }) => (
  <Typography component="div" className={classes.tabContent}>
    {children}
  </Typography>
));

export { ManagementTabContainer, ManagmentTabContent };
