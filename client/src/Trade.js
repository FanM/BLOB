import React, { useEffect, useRef, useState, useCallback } from "react";
import { gql, useQuery, ApolloProvider } from "@apollo/client";
import { makeStyles } from "@material-ui/core/styles";
import Grid from "@material-ui/core/Grid";
import Paper from "@material-ui/core/Paper";
import Divider from "@material-ui/core/Divider";
import Button from "@material-ui/core/Button";
import Switch from "@material-ui/core/Switch";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import Typography from "@material-ui/core/Typography";

import { parseErrorCode } from "./utils";
import Autocomplete from "./Autocomplete";
import TradeDetail from "./TradeDetail";
import { ManagementTabContainer, ManagmentTabContent } from "./AbstractTabs";

const useStyles = makeStyles((theme) => ({
  root: {
    backgroundColor: theme.palette.background.paper,
  },
  transactions: {
    margin: theme.spacing(0),
    padding: theme.spacing(0),
  },
  exchange: {
    display: "flex",
    justifyContent: "flex-start",
    flexDirection: "column",
  },
  switch: {
    margin: theme.spacing(1),
    padding: theme.spacing(0),
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

const tradeTxQuery = gql`
  query GetTradeTxs($where: TradeTranscation_filter) {
    tradeTranscations(where: $where, orderBy: txId) {
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
      counterpartyTeam {
        teamId
        name
      }
      counterpartyPlayers {
        playerId
      }
    }
  }
`;
const TradeTxList = ({
  classes,
  myTeamId,
  handleAcceptTx,
  handleRejectTx,
  handleCancelTx,
  graph_client,
  showMessage,
  langObj,
}) => {
  const [active, setActive] = useState(true);
  const [relatedToMe, setRelatedToMe] = useState(true);
  const status = active ? { status: 0 } : null;
  const { data } = useQuery(tradeTxQuery, {
    variables: {
      where: status,
    },
    fetchPolicy: "network-only",
  });

  const filterMyTx = (txList) =>
    relatedToMe
      ? txList.filter(
          (tx) =>
            tx.initiatorTeam.teamId === parseInt(myTeamId) ||
            tx.counterpartyTeam.teamId === parseInt(myTeamId)
        )
      : txList;

  return (
    <div className={classes.transactions}>
      <Grid container>
        <Grid item xs={6}>
          <FormControlLabel
            control={
              <Switch
                size="small"
                color="primary"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
              />
            }
            label={langObj.trade.TRADE_ACTVIE_SWITCH}
            className={classes.switch}
          />
        </Grid>
        <Grid item xs={6}>
          <FormControlLabel
            control={
              <Switch
                size="small"
                color="primary"
                checked={relatedToMe}
                onChange={(e) => setRelatedToMe(e.target.checked)}
              />
            }
            label={langObj.trade.TRADE_RELATED_SWITCH}
            className={classes.switch}
          />
        </Grid>
        {data &&
          filterMyTx(data.tradeTranscations).map((tx, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <TradeDetail
                tradeTx={tx}
                myTeamId={myTeamId}
                langObj={langObj}
                handleAcceptTx={handleAcceptTx}
                handleRejectTx={handleRejectTx}
                handleCancelTx={handleCancelTx}
              />
            </Grid>
          ))}
      </Grid>
    </div>
  );
};

const Trade = ({
  myTeamId,
  setTitle,
  showMessage,
  showLoading,
  graph_client,
  blobContracts,
  currentUser,
  langObj,
}) => {
  const classes = useStyles();
  const counterparty = useRef(undefined);
  const counterpartyPlayers = useRef([]);
  const myPlayers = useRef([]);
  const [teams, setTeams] = useState([]);
  const [counterpartyRoster, setCounterpartyRoster] = useState([]);
  const [myRoster, setMyRoster] = useState([]);

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

  const updateTradeTxList = useCallback(() => {
    graph_client.refetchQueries({
      include: [tradeTxQuery],
    });
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
    };
    setTitle(langObj.mainMenuItems.MAIN_MENU_TRADE);
    if (myTeamId !== null && graph_client !== null) init();
  }, [
    myTeamId,
    graph_client,
    langObj,
    setTitle,
    showMessage,
    getTeamList,
    getTeamRoster,
  ]);

  const handelCounterpartySelect = (v) => {
    if (v !== null) {
      counterparty.current = v.value;
      getTeamRoster(v.value, (roster) =>
        setCounterpartyRoster(
          roster.map((r) => {
            return { label: r.playerId, value: r.playerId };
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
        showMessage(langObj.errorDesc.CONTRACT_OPERATION_SUCCEEDED);
      })
      .catch((e) =>
        showMessage(parseErrorCode(langObj.errorDesc, e.reason, true))
      )
      .finally(() => showLoading(false));
  };

  const handleAcceptTx = (txId) => {
    showLoading(true);
    blobContracts.TeamContract.methods
      .AcceptTradeTx(txId)
      .send({ from: currentUser })
      .then(() => {
        showMessage(langObj.errorDesc.CONTRACT_OPERATION_SUCCEEDED);
        updateTradeTxList();
      })
      .catch((e) =>
        showMessage(parseErrorCode(langObj.errorDesc, e.reason, true))
      )
      .finally(() => showLoading(false));
  };

  const handleCancelTx = (txId) => {
    showLoading(true);
    blobContracts.TeamContract.methods
      .CancelTradeTx(txId)
      .send({ from: currentUser })
      .then(() => {
        showMessage(langObj.errorDesc.CONTRACT_OPERATION_SUCCEEDED);
        updateTradeTxList();
      })
      .catch((e) =>
        showMessage(parseErrorCode(langObj.errorDesc, e.reason, true))
      )
      .finally(() => showLoading(false));
  };

  const handleRejectTx = (txId) => {
    showLoading(true);
    blobContracts.TeamContract.methods
      .RejectTradeTx(txId)
      .send({ from: currentUser })
      .then(() => {
        showMessage(langObj.errorDesc.CONTRACT_OPERATION_SUCCEEDED);
        updateTradeTxList();
      })
      .catch((e) =>
        showMessage(parseErrorCode(langObj.errorDesc, e.reason, true))
      )
      .finally(() => showLoading(false));
  };

  return (
    <div className={classes.root}>
      <ManagementTabContainer>
        <ManagmentTabContent label={langObj.trade.TRADE_TRANSACTION_TAB}>
          {graph_client !== null && (
            <ApolloProvider client={graph_client}>
              <TradeTxList
                classes={classes}
                myTeamId={myTeamId}
                showMessage={showMessage}
                handleAcceptTx={handleAcceptTx}
                handleRejectTx={handleRejectTx}
                handleCancelTx={handleCancelTx}
                graph_client={graph_client}
                langObj={langObj}
              />
            </ApolloProvider>
          )}
        </ManagmentTabContent>
        <ManagmentTabContent
          label={langObj.trade.TRADE_EXCHANGE_TAB}
          disabled={myTeamId === null}
        >
          <Grid container className={classes.exchange}>
            <Grid item>
              <Typography variant="subtitle1" className={classes.title}>
                {langObj.trade.TRADE_PROPOSE_TRADE_LABEL}
              </Typography>
            </Grid>
            <Grid item>
              <Paper className={classes.paper}>
                <Autocomplete
                  inputLabel={langObj.trade.TRADE_COUNTERPARTY_TEAM_INPUT}
                  options={teams}
                  isMulti={false}
                  onSelect={handelCounterpartySelect}
                />
                <Autocomplete
                  inputLabel={langObj.trade.TRADE_COUNTERPARTY_PLAYER_INPUT}
                  options={counterpartyRoster}
                  isMulti={true}
                  onSelect={handelCounterpartyPlayerSelect}
                />
                <Divider className={classes.divider} />
                <Autocomplete
                  inputLabel={langObj.trade.TRADE_MY_PLAYER_INPUT}
                  options={myRoster}
                  isMulti={true}
                  onSelect={handelMyPlayerSelect}
                />
                <Grid container justifyContent="flex-end">
                  <Button color="primary" onClick={handleTradeSubmit}>
                    <Typography variant="subtitle2">
                      {langObj.trade.TRADE_PROPOSE_TRADE_BUTTON}
                    </Typography>
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
