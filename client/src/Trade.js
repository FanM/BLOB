import React, { useEffect, useRef, useState } from "react";
import { makeStyles } from "@material-ui/core/styles";
import Grid from "@material-ui/core/Grid";
import Paper from "@material-ui/core/Paper";
import Divider from "@material-ui/core/Divider";
import Button from "@material-ui/core/Button";
import Typography from "@material-ui/core/Typography";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";

import { getContractsAndAccount, parseErrorCode } from "./utils";
import Autocomplete from "./Autocomplete";
import TradeDetail from "./TradeDetail";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    justifyContent: "flex-start",
    flexDirection: "column",
  },

  title: { margin: theme.spacing(1) },

  paper: {
    margin: theme.spacing(1),
    padding: theme.spacing(1),
    //display: "flex",
    //flexWrap: "wrap",
    //alignItems: "flex-end",
    //flexDirection: "column",
  },
  input: {
    minWidth: 400,
  },
  divider: {
    margin: theme.spacing(2),
  },
  button: {
    margin: theme.spacing(1),
  },
}));

const Trade = ({ myTeamId, showMessage }) => {
  const classes = useStyles();
  const leagueContract = useRef(undefined);
  const teamContract = useRef(undefined);
  const utilsContract = useRef(undefined);
  const currentUser = useRef(undefined);
  const counterparty = useRef(undefined);
  const counterpartyPlayers = useRef([]);
  const myPlayers = useRef([]);
  const [teams, setTeams] = useState([]);
  const [counterpartyRoster, setCounterpartyRoster] = useState([]);
  const [myRoster, setMyRoster] = useState([]);
  const [tradeTxs, setTradeTxs] = useState([]);

  useEffect(() => {
    const init = async () => {
      window.ethereum.on("accountsChanged", (accounts) => {
        currentUser.current = accounts[0];
      });

      // Get contracts instance.
      const contractsAndAccount = await getContractsAndAccount();
      leagueContract.current = contractsAndAccount.LeagueContract;
      teamContract.current = contractsAndAccount.TeamContract;
      utilsContract.current = contractsAndAccount.UtilsContract;
      currentUser.current = contractsAndAccount.Account;
      const teams = await teamContract.current.methods.GetTeams().call();
      setTeams(
        teams
          .filter((t) => t.id !== myTeamId)
          .map((t) => {
            return { label: t.name, value: t.id };
          })
      );
      getTeamRoster(myTeamId, (roster) =>
        setMyRoster(
          roster.map((r) => {
            return { label: r, value: r };
          })
        )
      );
      getActiveTradeTx();
    };
    init();
  }, [myTeamId]);

  const getTeamRoster = (teamId, cbFunc) => {
    teamContract.current.methods
      .GetTeamRosterIds(teamId)
      .call()
      .then((roster) => cbFunc(roster));
  };

  const getActiveTradeTx = () => {
    leagueContract.current.methods
      .GetActiveTradeTxList()
      .call()
      .then((txs) => setTradeTxs(txs));
  };

  const handelCounterpartySelect = (v) => {
    if (v !== null) {
      counterparty.current = v.value;
      getTeamRoster(v.value, (roster) =>
        setCounterpartyRoster(
          roster.map((r) => {
            return { label: r, value: r };
          })
        )
      );
    } else {
      counterparty.current = undefined;
      setCounterpartyRoster([]);
    }
  };

  const handelCounterpartyPlayerSelect = (players) => {
    counterpartyPlayers.current = players.map((v) => v.value);
  };

  const handelMyPlayerSelect = (players) => {
    myPlayers.current = players.map((v) => v.value);
  };

  const handleTradeSubmit = () => {
    teamContract.current.methods
      .ProposeTradeTx(
        counterparty.current,
        myPlayers.current,
        counterpartyPlayers.current
      )
      .send({ from: currentUser.current })
      .then(() => {
        showMessage("Trade transaction submitted successfully");
        getActiveTradeTx();
      })
      .catch((e) =>
        parseErrorCode(utilsContract.current, e.message).then((s) =>
          showMessage(s, true)
        )
      );
  };

  const handleAcceptTx = (txId) => {
    teamContract.current.methods
      .AcceptTradeTx(txId)
      .send({ from: currentUser.current })
      .then(() => {
        showMessage("Trade transaction accepted successfully");
        getActiveTradeTx();
      })
      .catch((e) =>
        parseErrorCode(utilsContract.current, e.message).then((s) =>
          showMessage(s, true)
        )
      );
  };

  const handleCancelTx = (txId) => {
    teamContract.current.methods
      .CancelTradeTx(txId)
      .send({ from: currentUser.current })
      .then(() => {
        showMessage("Trade transaction cancelled successfully");
        getActiveTradeTx();
      })
      .catch((e) =>
        parseErrorCode(utilsContract.current, e.message).then((s) =>
          showMessage(s, true)
        )
      );
  };

  const handleRejectTx = (txId) => {
    teamContract.current.methods
      .RejectTradeTx(txId)
      .send({ from: currentUser.current })
      .then(() => {
        showMessage("Trade transaction rejected successfully");
        getActiveTradeTx();
      })
      .catch((e) =>
        parseErrorCode(utilsContract.current, e.message).then((s) =>
          showMessage(s, true)
        )
      );
  };

  return (
    <Grid container className={classes.root}>
      <Grid item>
        <Typography
          variant="subtitle1"
          color="primary"
          className={classes.title}
        >
          Propose a player trade
        </Typography>
      </Grid>
      <Grid item>
        <Paper className={classes.paper}>
          <Autocomplete
            className={classes.input}
            inputLabel="Counterparty Team"
            options={teams}
            isMulti={false}
            onSelect={handelCounterpartySelect}
          />
          <Autocomplete
            className={classes.input}
            inputLabel="Counterparty Players"
            options={counterpartyRoster}
            isMulti={true}
            onSelect={handelCounterpartyPlayerSelect}
          />
          <Divider className={classes.divider} />
          <Autocomplete
            className={classes.input}
            inputLabel="My Team"
            options={myRoster}
            isMulti={true}
            onSelect={handelMyPlayerSelect}
          />
          <Grid container justifyContent="flex-end">
            <Button color="primary" onClick={handleTradeSubmit}>
              <Typography variant="subtitle2">Submit</Typography>
            </Button>
          </Grid>
        </Paper>
      </Grid>
      <Grid item>
        <Typography
          variant="subtitle1"
          color="primary"
          className={classes.title}
        >
          Active trade transactions
        </Typography>
      </Grid>
      <Grid item>
        <Paper className={classes.paper}>
          <List>
            {tradeTxs.map((tx, index) => (
              <ListItem key={index}>
                <TradeDetail
                  tradeTx={tx}
                  myTeamId={myTeamId}
                  handleAcceptTx={handleAcceptTx}
                  handleRejectTx={handleRejectTx}
                  handleCancelTx={handleCancelTx}
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      </Grid>
    </Grid>
  );
};

export default Trade;
