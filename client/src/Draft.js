import React, { useState, useEffect, useRef, useCallback } from "react";
import { makeStyles } from "@material-ui/core/styles";
import Grid from "@material-ui/core/Grid";
import Paper from "@material-ui/core/Paper";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import Typography from "@material-ui/core/Typography";
import Button from "@material-ui/core/Button";

import DraftUnavailableIcon from "@material-ui/icons/Block";

import { parseErrorCode } from "./utils";
import PlayerDetail from "./PlayerDetail";
import CountdownCircle from "./CountdownCircle";

const useStyles = makeStyles((theme) => ({
  paper: {
    margin: theme.spacing(5),
    padding: theme.spacing(2),
    paddingBottom: theme.spacing(0),
    textAlign: "center",
  },
  pick: {
    justifyContent: "center",
  },
  button: {
    margin: theme.spacing(1),
    padding: theme.spacing(1),
  },
  no_draft: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    margin: theme.spacing(1),
    padding: theme.spacing(1),
  },
  timer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    margin: theme.spacing(1),
    padding: theme.spacing(2),
  },
}));

const DRAFT_NOT_STARTED_MESSAGE = "DRAFT IS NOT STARTED YET";
const DRAFT_PICK_TIME_LIMIT_SECONDS = 10 * 60;

const Draft = ({
  setTitle,
  myTeamId,
  seasonState,
  showMessage,
  showLoading,
  blobContracts,
  currentUser,
}) => {
  const classes = useStyles();

  const teamRanking = useRef([]);
  const countDownTimer = useRef(undefined);
  const draftRound = useRef(undefined);
  const currentPickTeam = useRef(undefined);

  const [draftPlayerList, setDraftPlayerList] = useState([]);
  const [progress, setProgress] = React.useState({ value: 0, timer: 0 });

  const updateDraftPlayerList = useCallback(() => {
    blobContracts.SeasonContract.methods
      .GetDraftPlayerList()
      .call()
      .then((playerIds) => {
        Promise.all(
          playerIds.map((id) =>
            blobContracts.PlayerContract.methods.GetPlayer(id).call()
          )
        ).then((players) => setDraftPlayerList(players.sort()));
      });
  }, [blobContracts]);

  const updatePickTeam = useCallback(async () => {
    const currentPickStartTime = parseInt(
      await blobContracts.SeasonContract.methods.currentPickStartTime().call()
    );
    let currentPickOrder = parseInt(
      await blobContracts.SeasonContract.methods.currentPickOrder().call()
    );
    draftRound.current = parseInt(
      await blobContracts.SeasonContract.methods.draftRound().call()
    );
    const rankings = teamRanking.current;
    const now = Math.floor(Date.now() / 1000);
    let timeSpan = now - currentPickStartTime;
    while (timeSpan > rankings.length * DRAFT_PICK_TIME_LIMIT_SECONDS) {
      timeSpan -= rankings.length * DRAFT_PICK_TIME_LIMIT_SECONDS;
      draftRound.current = draftRound.current + 1;
    }
    while (timeSpan > DRAFT_PICK_TIME_LIMIT_SECONDS) {
      timeSpan -= DRAFT_PICK_TIME_LIMIT_SECONDS;
      currentPickOrder = (currentPickOrder + 1) % rankings.length;
    }

    currentPickTeam.current = rankings[rankings.length - currentPickOrder - 1];
    setProgress({ timer: DRAFT_PICK_TIME_LIMIT_SECONDS - timeSpan, value: 0 });
    updateDraftPlayerList();

    if (countDownTimer.current !== undefined)
      clearInterval(countDownTimer.current);

    const endTime = now + DRAFT_PICK_TIME_LIMIT_SECONDS - timeSpan;
    countDownTimer.current = setInterval(() => {
      setProgress((prevProgress) => {
        const secondsLeft = endTime - Math.floor(Date.now() / 1000);
        if (secondsLeft <= 0) {
          // clears the current timer
          clearInterval(countDownTimer.current);
          updatePickTeam();
        }

        return {
          timer: secondsLeft,
          value: Math.round(
            (100 * prevProgress.timer) / DRAFT_PICK_TIME_LIMIT_SECONDS
          ),
        };
      });
    }, 1000);
  }, [updateDraftPlayerList, blobContracts]);

  useEffect(() => {
    const init = async () => {
      setTitle("Draft");
      // Get contracts instance.
      await blobContracts.SeasonContract.methods
        .GetTeamRanking()
        .call()
        .then((r) => (teamRanking.current = r));

      if (seasonState === "2") {
        await blobContracts.SeasonContract.methods
          .draftRound()
          .call()
          .then((round) => (draftRound.current = parseInt(round)));
        await updatePickTeam();
      }
      await updateDraftPlayerList();
    };
    init();
  }, [
    myTeamId,
    seasonState,
    updatePickTeam,
    updateDraftPlayerList,
    setTitle,
    blobContracts,
    currentUser,
  ]);

  const handlePickPlayer = (id) => {
    showLoading(true);
    blobContracts.TeamContract.methods
      .DraftPlayer(id)
      .send({ from: currentUser })
      .then(() => {
        showMessage(`Drafted Player ${id} successfully`);
        updatePickTeam();
      })
      .catch((e) =>
        parseErrorCode(blobContracts.UtilsContract.current, e.message).then(
          (s) => showMessage(s, true)
        )
      )
      .finally(() => showLoading(false));
  };

  const displayDraftPlayers = () =>
    draftPlayerList.map((player, index) => (
      <ListItem key={index}>
        <Grid container className={classes.pick}>
          <Grid item xs={12}>
            <PlayerDetail player={player} />
          </Grid>
          <Grid item xs={2}>
            <Button
              color="primary"
              className={classes.button}
              disabled={currentPickTeam.current !== myTeamId}
              onClick={() => handlePickPlayer(player.id)}
            >
              <Typography variant="subtitle2">Pick</Typography>
            </Button>
          </Grid>
        </Grid>
      </ListItem>
    ));

  return (
    <Grid container>
      {seasonState !== "2" && (
        <Grid container className={classes.no_draft}>
          <Grid item>
            <DraftUnavailableIcon color="secondary" />
          </Grid>
          <Grid item>
            <Typography color="secondary">
              <strong>{DRAFT_NOT_STARTED_MESSAGE}</strong>
            </Typography>
          </Grid>
        </Grid>
      )}
      {seasonState === "2" && (
        <Grid item xs={12}>
          <Paper elevation={3} className={classes.paper}>
            <Grid container>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="primary">
                  ROUND
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="primary">
                  CURRENT PICK TEAM
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="h6" color="primary">
                  <strong>{draftRound.current}</strong>
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="h6" color="primary">
                  <strong>{currentPickTeam.current}</strong>
                </Typography>
              </Grid>
              <Grid container className={classes.timer}>
                <Grid item>
                  <CountdownCircle value={{ ...progress, size: 80 }} />
                </Grid>
                <Grid item>
                  <Typography variant="body2">Time Left To Pick</Typography>
                </Grid>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      )}
      {(seasonState === 1 || seasonState === 2) && (
        <Grid item xs={12}>
          <Typography align="center" variant="subtitle2">
            PROSPECT PLAYERS
          </Typography>
        </Grid>
      )}
      <Grid item xs={12}>
        <List>{displayDraftPlayers()}</List>
      </Grid>
    </Grid>
  );
};

export default Draft;
