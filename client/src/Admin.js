import React, { useEffect } from "react";
import { makeStyles } from "@material-ui/core/styles";
import Grid from "@material-ui/core/Grid";
import Button from "@material-ui/core/Button";

import { parseErrorCode } from "./utils";

const useStyles = makeStyles((theme) => ({
  container: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  item: {
    flexGrow: 1,
  },
  button: {
    margin: theme.spacing(1),
  },
}));

const Admin = ({
  setTitle,
  showMessage,
  seasonState,
  blobContracts,
  currentUser,
  langObj,
}) => {
  const classes = useStyles();

  useEffect(() => {
    const init = () => {
      setTitle("BLOB Admin");
    };
    if (blobContracts !== null) init();
  }, [setTitle, blobContracts]);

  const playMatch = () => {
    blobContracts.LeagueContract.methods
      .PlayMatch()
      .send({ from: currentUser })
      .then(() => showMessage("Successfully played a match"))
      .catch((e) =>
        showMessage(parseErrorCode(langObj.errorDesc, e.reason), true)
      );
  };

  const startDraft = () => {
    blobContracts.LeagueContract.methods
      .StartDraft()
      .send({ from: currentUser })
      .then(() => showMessage("Draft started successfully"))
      .catch((e) =>
        showMessage(parseErrorCode(langObj.errorDesc, e.reason), true)
      );
  };

  const endDraft = () => {
    blobContracts.LeagueContract.methods
      .EndDraft()
      .send({ from: currentUser })
      .then(() => showMessage("Draft ended successfully"))
      .catch((e) =>
        showMessage(parseErrorCode(langObj.errorDesc, e.reason), true)
      );
  };

  return (
    <Grid container className={classes.container}>
      <Grid item className={classes.item} xs={12}>
        <Button
          onClick={playMatch}
          variant="contained"
          className={classes.button}
          disabled={seasonState !== 0}
        >
          Play Game
        </Button>
      </Grid>
      <Grid item className={classes.item} xs={6}>
        <Button
          onClick={startDraft}
          variant="contained"
          className={classes.button}
          disabled={seasonState !== 1}
        >
          Start Draft
        </Button>
      </Grid>
      <Grid item className={classes.item} xs={6}>
        <Button
          onClick={endDraft}
          variant="contained"
          className={classes.button}
          disabled={seasonState !== 2}
        >
          End Draft
        </Button>
      </Grid>
    </Grid>
  );
};

export default Admin;
