import React, { Fragment, useEffect, useRef, useState } from "react";
import { makeStyles } from "@material-ui/core/styles";
import Grid from "@material-ui/core/Grid";
import Paper from "@material-ui/core/Paper";
import Divider from "@material-ui/core/Divider";
import Button from "@material-ui/core/Button";
import Typography from "@material-ui/core/Typography";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";

import { getContractsAndAccount, parseErrorCode } from "./utils";
import Autocomplete from "./Autocomplete";

const useStyles = makeStyles((theme) => ({
  root: { margin: theme.spacing(1), padding: theme.spacing(1) },
  divider: {
    margin: theme.spacing(2),
  },
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
  }, []);

  const getTeamRoster = (teamId, cbFunc) => {
    teamContract.current.methods
      .GetTeamRosterIds(teamId)
      .call()
      .then((roster) => cbFunc(roster));
  };

  const getActiveTradeTx = () => {
    leagueContract.current.methods
      .GetActiveTradeTx(0)
      .call()
      .then((txs) => setTradeTxs([txs]));
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
        parseErrorCode(e.message).then((s) => showMessage(s, true))
      );
  };

  return (
    <Fragment>
      <Paper className={classes.root}>
        <Grid container justifyContent="center" className={classes.container}>
          <Grid item className={classes.item}>
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
          </Grid>
        </Grid>
        <Divider className={classes.divider} />
        <Grid container justifyContent="center" className={classes.container}>
          <Grid item xs={12} className={classes.item}>
            <Autocomplete
              inputLabel="My Team"
              options={myRoster}
              isMulti={true}
              onSelect={handelMyPlayerSelect}
            />
          </Grid>
          <Grid item className={classes.item}>
            <Button color="primary" onClick={handleTradeSubmit}>
              <Typography variant="subtitle2">Submit</Typography>
            </Button>
          </Grid>
        </Grid>
      </Paper>
      <List>
        {tradeTxs.map((tx, index) => (
          <ListItem key={index} button>
            <ListItemText
              primary={tx.id}
              secondary={`Initiator: ${tx.initiatorTeam} Counterparty: ${tx.counterpartyTeam} `}
            />
          </ListItem>
        ))}
      </List>
    </Fragment>
  );
};

export default Trade;
