import React, { useEffect, useRef, useState, useCallback } from "react";
import { gql } from "@apollo/client";
import { makeStyles } from "@material-ui/core/styles";
import Grid from "@material-ui/core/Grid";
import Paper from "@material-ui/core/Paper";
import Divider from "@material-ui/core/Divider";
import Button from "@material-ui/core/Button";
import Typography from "@material-ui/core/Typography";

import { parseErrorCode } from "./utils";
import Autocomplete from "./Autocomplete";
import TradeDetail from "./TradeDetail";
import { ManagementTabContainer, ManagmentTabContent } from "./AbstractTabs";

const useStyles = makeStyles((theme) => ({
  root: {
    flexGrow: 1,
  },
  transaction: {
    flexGrow: 1,
    justifyContent: "center",
  },
  exchange: {
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
  graph_client,
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

  const getTeamList = useCallback(
    (myTeamId) => {
      const teamListQuery = `
        query {
          teams{
            teamId,
            name
          }
        }
      `;
      return graph_client
        .query({
          query: gql(teamListQuery),
        })
        .then((data) => {
          setTeams(
            data.data.teams
              .filter((t) => t.teamId !== parseInt(myTeamId))
              .map((t) => {
                return { label: t.name, value: t.teamId };
              })
          );
        })
        .catch((e) => showMessage(e.message, true));
    },
    [graph_client, showMessage]
  );

  const getTeamRoster = useCallback(
    (teamId, cbFunc) => {
      const playerListQuery = `
        query {
          players(orderBy: playerId, where: {team: "${teamId}"}){
            playerId,
          }
        }
      `;
      return graph_client
        .query({
          query: gql(playerListQuery),
        })
        .then((data) => cbFunc(data.data.players))
        .catch((e) => showMessage(e.message, true));
    },
    [graph_client, showMessage]
  );

  const getActiveTradeTx = useCallback(() => {
    const tradeTxQuery = `
      query {
        tradeTranscations{
          txId
          status
          timeCreated
          timeFinalized
          initiatorTeam {
            teamId
            name
          }
          initiatorPlayers {
            playerId
          }
          counterpartyTeam{
            teamId
            name
          }
          counterpartyPlayers {
            playerId
          }
        }
      }
      `;
    return graph_client
      .query({
        query: gql(tradeTxQuery),
      })
      .then((data) => setTradeTxs(data.data.tradeTranscations));
  }, [graph_client]);

  useEffect(() => {
    const init = () => {
      getTeamList(myTeamId);
      getTeamRoster(myTeamId, (roster) =>
        setMyRoster(
          roster.map((r) => {
            return { label: r.playerId, value: r.playerId };
          })
        )
      );
      getActiveTradeTx().catch((e) => showMessage(e.message, true));
    };
    if (myTeamId !== null && graph_client !== null) init();
  }, [
    myTeamId,
    graph_client,
    showMessage,
    getTeamList,
    getTeamRoster,
    getActiveTradeTx,
  ]);

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
    <div className={classes.root}>
      <ManagementTabContainer>
        <ManagmentTabContent label="Transactions">
          <Grid container className={classes.transaction}>
            {tradeTxs.map((tx, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <TradeDetail
                  tradeTx={tx}
                  myTeamId={myTeamId}
                  handleAcceptTx={handleAcceptTx}
                  handleRejectTx={handleRejectTx}
                  handleCancelTx={handleCancelTx}
                />
              </Grid>
            ))}
          </Grid>
        </ManagmentTabContent>
        <ManagmentTabContent label="Exchange">
          <Grid container className={classes.exchange}>
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
          </Grid>
        </ManagmentTabContent>
      </ManagementTabContainer>
    </div>
  );
};

export default Trade;
