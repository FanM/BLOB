import React, { useEffect, useRef, useState, useCallback } from "react";
import { makeStyles } from "@material-ui/core/styles";
import Grid from "@material-ui/core/Grid";
import Paper from "@material-ui/core/Paper";
import Divider from "@material-ui/core/Divider";
import Button from "@material-ui/core/Button";
import Typography from "@material-ui/core/Typography";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";

import { parseErrorCode } from "./utils";
import Autocomplete from "./Autocomplete";
import TradeDetail from "./TradeDetail";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    justifyContent: "flex-start",
    flexDirection: "column",
  },

  title: { margin: theme.spacing(1), color: theme.palette.text.secondary },

  paper: {
    flexGrow: 1,
    margin: theme.spacing(0),
    padding: theme.spacing(1),
  },
  divider: {
    margin: theme.spacing(2),
  },
  button: {
    margin: theme.spacing(1),
  },
}));

const Trade = ({
  myTeamId,
  showMessage,
  showLoading,
  blobContracts,
  currentUser,
}) => {
  const classes = useStyles();
  const counterparty = useRef(undefined);
  const counterpartyPlayers = useRef([]);
  const myPlayers = useRef([]);
  const [teams, setTeams] = useState([]);
  const [counterpartyRoster, setCounterpartyRoster] = useState([]);
  const [myRoster, setMyRoster] = useState([]);
  const [tradeTxs, setTradeTxs] = useState([]);

  const getTeamRoster = useCallback(
    (teamId, cbFunc) => {
      blobContracts.TeamContract.methods
        .GetTeamRosterIds(teamId)
        .call()
        .then((roster) => cbFunc(roster));
    },
    [blobContracts]
  );

  const getActiveTradeTx = useCallback(() => {
    blobContracts.LeagueContract.methods
      .GetActiveTradeTxList()
      .call()
      .then((txs) => setTradeTxs(txs));
  }, [blobContracts]);

  useEffect(() => {
    const init = () => {
      blobContracts.TeamContract.methods
        .GetTeams()
        .call()
        .then((teams) => {
          setTeams(
            teams
              .filter((t) => t.id !== myTeamId)
              .map((t) => {
                return { label: t.name, value: t.id };
              })
          );
        });
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
  }, [myTeamId, blobContracts, getTeamRoster, getActiveTradeTx]);

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
    showLoading(true);
    blobContracts.TeamContract.methods
      .ProposeTradeTx(
        counterparty.current,
        myPlayers.current,
        counterpartyPlayers.current
      )
      .send({ from: currentUser })
      .then(() => {
        showMessage("Trade transaction submitted successfully");
        return getActiveTradeTx();
      })
      .catch((e) =>
        parseErrorCode(blobContracts.UtilsContract, e.message).then((s) =>
          showMessage(s, true)
        )
      )
      .finally(() => showLoading(false));
  };

  const handleAcceptTx = (txId) => {
    showLoading(true);
    blobContracts.TeamContract.methods
      .AcceptTradeTx(txId)
      .send({ from: currentUser })
      .then(() => {
        showMessage("Trade transaction accepted successfully");
        return getActiveTradeTx();
      })
      .catch((e) =>
        parseErrorCode(blobContracts.UtilsContract, e.message).then((s) =>
          showMessage(s, true)
        )
      )
      .finally(() => showLoading(false));
  };

  const handleCancelTx = (txId) => {
    showLoading(true);
    blobContracts.TeamContract.methods
      .CancelTradeTx(txId)
      .send({ from: currentUser })
      .then(() => {
        showMessage("Trade transaction cancelled successfully");
        return getActiveTradeTx();
      })
      .catch((e) =>
        parseErrorCode(blobContracts.UtilsContract, e.message).then((s) =>
          showMessage(s, true)
        )
      )
      .finally(() => showLoading(false));
  };

  const handleRejectTx = (txId) => {
    showLoading(true);
    blobContracts.TeamContract.methods
      .RejectTradeTx(txId)
      .send({ from: currentUser })
      .then(() => {
        showMessage("Trade transaction rejected successfully");
        return getActiveTradeTx();
      })
      .catch((e) =>
        parseErrorCode(blobContracts.UtilsContract, e.message).then((s) =>
          showMessage(s, true)
        )
      )
      .finally(() => showLoading(false));
  };

  return (
    <Grid container className={classes.root}>
      <Grid item>
        <Typography variant="subtitle1" className={classes.title}>
          Propose a player trade
        </Typography>
      </Grid>
      <Grid item>
        <Paper className={classes.paper}>
          <Autocomplete
            inputLabel="Counterparty Team"
            options={teams}
            isMulti={false}
            onSelect={handelCounterpartySelect}
          />
          <Autocomplete
            inputLabel="Counterparty Players"
            options={counterpartyRoster}
            isMulti={true}
            onSelect={handelCounterpartyPlayerSelect}
          />
          <Divider className={classes.divider} />
          <Autocomplete
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
        <Typography variant="subtitle1" className={classes.title}>
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
