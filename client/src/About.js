import React, { useEffect } from "react";
import { makeStyles } from "@material-ui/core/styles";
import Grid from "@material-ui/core/Grid";
import Button from "@material-ui/core/Button";
import Paper from "@material-ui/core/Paper";
import IconButton from "@material-ui/core/IconButton";
import Typography from "@material-ui/core/Typography";

import GitHubIcon from "@material-ui/icons/GitHub";

import { githubLink } from "./env.json";

const useStyles = makeStyles((theme) => ({
  paper: {
    minHeight: "100vh",
    opacity: 0.99,
  },
  container: {
    display: "flex",
    flexWrap: "wrap",
    alignContent: "center",
    textAlign: "center",
  },
  item: {
    flexGrow: 1,
  },
  text: {
    marginTop: theme.spacing(3),
    margin: theme.spacing(2),
    padding: theme.spacing(1),
    color: theme.palette.text.secondary,
  },
  imageText: {
    margin: theme.spacing(2),
    padding: theme.spacing(1),
  },
  manualLink: {
    marginTop: theme.spacing(0),
    marginLeft: theme.spacing(2),
    paddingLeft: theme.spacing(1),
  },
  gitButton: {
    marginTop: theme.spacing(0),
    "& svg": {
      fontSize: 30,
    },
  },
}));

const About = ({ setTitle, langObj }) => {
  const classes = useStyles();

  useEffect(() => {
    const init = () => {
      setTitle(langObj.mainMenuItems.MAIN_MENU_ABOUT);
    };
    init();
  }, [setTitle, langObj]);

  const handleManualClick = () => {
    window.open(langObj.about.ABOUT_BLOB_PLAYER_MANUAL.link);
  };

  const handleGithubClick = () => {
    window.open(githubLink);
  };

  return (
    <Paper className={classes.paper}>
      <Grid container className={classes.container}>
        <Grid item className={classes.item} xs={12}>
          <Typography className={classes.text}>
            <em>
              <strong>
                BLOB (Basketball League On Blockchain)
                {langObj.about.ABOUT_BLOB_SHORT_DESC}
                <br />
                {langObj.about.ABOUT_BLOB_SECOND_LINE}
              </strong>
            </em>
          </Typography>
        </Grid>
        <Grid item className={classes.item} xs={12}>
          <Button
            onClick={handleManualClick}
            color="primary"
            className={classes.manualLink}
          >
            <Typography variant="h6">
              <strong>{langObj.about.ABOUT_BLOB_PLAYER_MANUAL.name}</strong>
            </Typography>
          </Button>
        </Grid>
        <Grid item className={classes.item}>
          <IconButton onClick={handleGithubClick} className={classes.gitButton}>
            <GitHubIcon />
          </IconButton>
        </Grid>
        <Grid item className={classes.item} xs={12}>
          <Typography className={classes.imageText}>
            <em>{langObj.about.ABOUT_BACKGROUND_IMAGE_DESC}</em>
          </Typography>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default About;
