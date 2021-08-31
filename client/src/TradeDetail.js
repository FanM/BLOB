import React from "react";

import { withStyles } from "@material-ui/core/styles";
import Card from "@material-ui/core/Card";
import CardHeader from "@material-ui/core/CardHeader";
import CardContent from "@material-ui/core/CardContent";
import Chip from "@material-ui/core/Chip";
import Typography from "@material-ui/core/Typography";
import Grid from "@material-ui/core/Grid";
import Button from "@material-ui/core/Button";

const styles = (theme) => ({
  players: {
    margin: theme.spacing(1),
    flexDirection: "row",
    justifyContent: "flex-start",
  },

  card: {
    flexGrow: 1,
    margin: theme.spacing(-1),
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
});

const TradeDetail = withStyles(styles)(
  ({
    classes,
    tradeTx,
    myTeamId,
    handleAcceptTx,
    handleCancelTx,
    handleRejectTx,
  }) => {
    const displayPlayers = (players) =>
      players.map((id, index) => (
        <Grid item key={index}>
          <Chip label={id} />
        </Grid>
      ));

    return (
      <Card style={{ width: 320 }} className={classes.card}>
        <CardHeader title={`Tx #${tradeTx.id}`} subheader="ACTIVE" />
        <CardContent className={classes.cardContent}>
          <Grid container justifyContent="space-between">
            <Grid item>
              <Typography>
                Initiator <strong>{tradeTx.initiatorTeam}</strong>{" "}
              </Typography>
              <Grid container className={classes.players}>
                {displayPlayers(tradeTx.initiatorPlayers)}
              </Grid>
            </Grid>
            <Grid item>
              <Typography>
                Counterparty <strong>{tradeTx.counterpartyTeam} </strong>
              </Typography>
              <Grid container className={classes.players}>
                {displayPlayers(tradeTx.counterpartyPlayers)}
              </Grid>
            </Grid>
          </Grid>
          <Grid container justifyContent="flex-end">
            <Grid item>
              {tradeTx.counterpartyTeam === myTeamId && (
                <Button
                  color="primary"
                  className={classes.button}
                  onClick={() => handleAcceptTx(tradeTx.id)}
                >
                  <Typography variant="subtitle2">Accept</Typography>
                </Button>
              )}
            </Grid>
            <Grid item>
              {tradeTx.counterpartyTeam === myTeamId && (
                <Button
                  color="primary"
                  className={classes.button}
                  onClick={() => handleRejectTx(tradeTx.id)}
                >
                  <Typography variant="subtitle2">Reject</Typography>
                </Button>
              )}
            </Grid>
            <Grid item>
              {tradeTx.initiatorTeam === myTeamId && (
                <Button
                  color="primary"
                  className={classes.button}
                  onClick={() => handleCancelTx(tradeTx.id)}
                >
                  <Typography variant="subtitle2">Cancel</Typography>
                </Button>
              )}
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    );
  }
);

export default TradeDetail;
