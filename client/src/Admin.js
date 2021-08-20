import React, { useEffect, useRef } from "react";
import { makeStyles } from "@material-ui/core/styles";
import Grid from "@material-ui/core/Grid";
import Button from "@material-ui/core/Button";

import { getContractsAndAccount, parseErrorCode } from "./utils";

const useStyles = makeStyles((theme) => ({
  container: {
    display: "flex",
    flexWrap: "wrap",
  },
  item: {
    flexGrow: 1,
  },
  button: {
    margin: theme.spacing(1),
  },
}));

const Admin = ({ setTitle, showMessage }) => {
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

  return (
    <Grid container justifyContent="center" className={classes.container}>
      <Grid item className={classes.item}>
        <Button
          onClick={startSeason}
          variant="contained"
          className={classes.button}
        >
          Start Season
        </Button>
      </Grid>
      <Grid item className={classes.item}>
        <Button
          onClick={playMatch}
          variant="contained"
          className={classes.button}
        >
          Play Game
        </Button>
      </Grid>
    </Grid>
  );
};

export default Admin;
