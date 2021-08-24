import React, { useEffect, useRef } from "react";
import { makeStyles } from "@material-ui/core/styles";
import Grid from "@material-ui/core/Grid";
import Button from "@material-ui/core/Button";

import { getContractsAndAccount, parseErrorCode } from "./utils";

const useStyles = makeStyles((theme) => ({
  container: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-around",
  },
  item: {
    flexGrow: 1,
  },
  button: {
    margin: theme.spacing(1),
  },
}));

const Admin = ({ setTitle, showMessage, seasonState }) => {
  const classes = useStyles();
  const leagueContract = useRef(undefined);
  const seasonContract = useRef(undefined);
  const teamContract = useRef(undefined);
  const utilsContract = useRef(undefined);
  const currentUser = useRef(undefined);

  useEffect(() => {
    const init = async () => {
      window.ethereum.on("accountsChanged", (accounts) => {
        currentUser.current = accounts[0];
      });

      setTitle("BLOB Admin");
      // Get contracts instance.
      const contractsAndAccount = await getContractsAndAccount();
      leagueContract.current = contractsAndAccount.LeagueContract;
      teamContract.current = contractsAndAccount.TeamContract;
      seasonContract.current = contractsAndAccount.SeasonContract;
      utilsContract.current = contractsAndAccount.UtilsContract;
      currentUser.current = contractsAndAccount.Account;
    };
    init();
  }, [setTitle]);

  const startSeason = () => {
    leagueContract.current.methods
      .StartSeason()
      .send({ from: currentUser.current })
      .then(() => showMessage("Successfully started a season"))
      .catch((e) =>
        parseErrorCode(utilsContract.current, e.message).then((s) =>
          showMessage(s, true)
        )
      );
  };

  const playMatch = () => {
    leagueContract.current.methods
      .PlayMatch()
      .send({ from: currentUser.current })
      .then(() => showMessage("Successfully played a match"))
      .catch((e) =>
        parseErrorCode(utilsContract.current, e.message).then((s) =>
          showMessage(s, true)
        )
      );
  };

  const startDraft = () => {
    leagueContract.current.methods
      .StartDraft()
      .send({ from: currentUser.current })
      .then(() => showMessage("Draft started successfully"))
      .catch((e) =>
        parseErrorCode(utilsContract.current, e.message).then((s) =>
          showMessage(s, true)
        )
      );
  };

  const endDraft = () => {
    leagueContract.current.methods
      .EndDraft()
      .send({ from: currentUser.current })
      .then(() => showMessage("Draft ended successfully"))
      .catch((e) =>
        parseErrorCode(utilsContract.current, e.message).then((s) =>
          showMessage(s, true)
        )
      );
  };

  return (
    <Grid container className={classes.container}>
      <Grid item className={classes.item} xs={6}>
        <Button
          onClick={startSeason}
          variant="contained"
          className={classes.button}
          disabled={seasonState !== "3"}
        >
          Start Season
        </Button>
      </Grid>
      <Grid item className={classes.item} xs={6}>
        <Button
          onClick={playMatch}
          variant="contained"
          className={classes.button}
          disabled={seasonState !== "0"}
        >
          Play Game
        </Button>
      </Grid>
      <Grid item className={classes.item} xs={6}>
        <Button
          onClick={startDraft}
          variant="contained"
          className={classes.button}
          disabled={seasonState !== "1"}
        >
          Start Draft
        </Button>
      </Grid>
      <Grid item className={classes.item} xs={6}>
        <Button
          onClick={endDraft}
          variant="contained"
          className={classes.button}
          disabled={seasonState !== "2"}
        >
          End Draft
        </Button>
      </Grid>
    </Grid>
  );
};

export default Admin;
