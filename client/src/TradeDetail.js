import React from "react";
import { LinkContainer } from "react-router-bootstrap";

import { withStyles } from "@material-ui/core/styles";
import Card from "@material-ui/core/Card";
import CardHeader from "@material-ui/core/CardHeader";
import CardContent from "@material-ui/core/CardContent";
import Chip from "@material-ui/core/Chip";
import Typography from "@material-ui/core/Typography";
import Grid from "@material-ui/core/Grid";
import Button from "@material-ui/core/Button";

import { timestampToDate } from "./utils";

const styles = (theme) => ({
  players: {
    margin: theme.spacing(1),
    flexDirection: "row",
    justifyContent: "flex-start",
  },

  card: {
    flexGrow: 1,
    margin: theme.spacing(1),
    marginBottom: theme.spacing(2),
    padding: theme.spacing(0),
  },

  cardContent: {
    "&:last-child": {
      paddingBottom: 0,
    },
  },

  button: {
    padding: theme.spacing(2),
  },

  teamLink: {
    margin: theme.spacing(-1),
    paddingBottom: theme.spacing(1),
  },
});

const TradeDetail = withStyles(styles)(
  ({
    classes,
    tradeTx,
    myTeamId,
    langObj,
    handleAcceptTx,
    handleCancelTx,
    handleRejectTx,
  }) => {
    const displayPlayers = (players) =>
      players.map((player, index) => (
        <Grid item key={index}>
          <LinkContainer to={`/player/${player.playerId}`}>
            <Chip label={player.playerId} clickable />
          </LinkContainer>
        </Grid>
      ));

    return (
      <Grid container justifyContent="center">
        <Card style={{ width: 320 }} className={classes.card}>
          <CardHeader
            title={`Tx #${tradeTx.txId}`}
            subheader={
              langObj.tradeDetail.TRADE_DETAIL_TRANSACTION_STATUS[
                tradeTx.status
              ]
            }
          />
          <CardContent className={classes.cardContent}>
            <Grid container justifyContent="space-between">
              <Grid item xs={12}>
                <Typography variant="body2">
                  {`${
                    langObj.tradeDetail.TRADE_DETAIL_TX_CREATED_LABEL
                  }: ${timestampToDate(tradeTx.timeCreated)}`}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                {tradeTx.status !== 0 && (
                  <Typography variant="body2">
                    {`${
                      langObj.tradeDetail.TRADE_DETAIL_TX_FINALIZED_LABEL
                    }: ${timestampToDate(tradeTx.timeFinalized)}`}
                  </Typography>
                )}
              </Grid>
              <Grid item xs={6}>
                <Typography>
                  <LinkContainer to={`/team/${tradeTx.initiatorTeam.teamId}`}>
                    <Button color="primary" className={classes.teamLink}>
                      <strong>{tradeTx.initiatorTeam.name}</strong>{" "}
                    </Button>
                  </LinkContainer>
                </Typography>
                <Grid container className={classes.players}>
                  {displayPlayers(tradeTx.initiatorPlayers)}
                </Grid>
              </Grid>
              <Grid item xs={6}>
                <Typography>
                  <LinkContainer
                    to={`/team/${tradeTx.counterpartyTeam.teamId}`}
                  >
                    <Button color="primary" className={classes.teamLink}>
                      <strong>{tradeTx.counterpartyTeam.name} </strong>
                    </Button>
                  </LinkContainer>
                </Typography>
                <Grid container className={classes.players}>
                  {displayPlayers(tradeTx.counterpartyPlayers)}
                </Grid>
              </Grid>
            </Grid>
            <Grid container justifyContent="flex-end">
              <Grid item>
                {tradeTx.status === 0 &&
                  tradeTx.counterpartyTeam.teamId === parseInt(myTeamId) && (
                    <Button
                      color="primary"
                      className={classes.button}
                      onClick={() => handleAcceptTx(tradeTx.txId)}
                    >
                      <Typography variant="subtitle2">
                        {langObj.tradeDetail.TRADE_DETAIL_TX_ACCEPT_BUTTON}
                      </Typography>
                    </Button>
                  )}
              </Grid>
              <Grid item>
                {tradeTx.status === 0 &&
                  tradeTx.counterpartyTeam.teamId === parseInt(myTeamId) && (
                    <Button
                      color="primary"
                      className={classes.button}
                      onClick={() => handleRejectTx(tradeTx.txId)}
                    >
                      <Typography variant="subtitle2">
                        {langObj.tradeDetail.TRADE_DETAIL_TX_REJECT_BUTTON}
                      </Typography>
                    </Button>
                  )}
              </Grid>
              <Grid item>
                {tradeTx.status === 0 &&
                  tradeTx.initiatorTeam.teamId === parseInt(myTeamId) && (
                    <Button
                      color="primary"
                      className={classes.button}
                      onClick={() => handleCancelTx(tradeTx.txId)}
                    >
                      <Typography variant="subtitle2">
                        {langObj.tradeDetail.TRADE_DETAIL_TX_CANCEL_BUTTON}
                      </Typography>
                    </Button>
                  )}
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    );
  }
);

export default TradeDetail;
