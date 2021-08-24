import React, { useState, useEffect, useRef, useCallback } from "react";
import { makeStyles } from "@material-ui/core/styles";
import Grid from "@material-ui/core/Grid";
import Paper from "@material-ui/core/Paper";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import Typography from "@material-ui/core/Typography";
import Button from "@material-ui/core/Button";

import DraftUnavailableIcon from "@material-ui/icons/Block";

import { getContractsAndAccount, parseErrorCode } from "./utils";
import PlayerDetail from "./PlayerDetail";
import CountdownCircle from "./CountdownCircle";

const useStyles = makeStyles((theme) => ({
  root: {
    margin: theme.spacing(1),
    flexFlow: "flex wrap",
    alignItems: "center",
    flexDirection: "column",
  },
  draft: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    margin: theme.spacing(5),
    padding: theme.spacing(2),
    paddingBottom: theme.spacing(0),
    maxWidth: 400,
  },
  list: {
    display: "flex",
    justifyContent: "center",
  },
  pick: {
    flexFlow: "flex wrap",
    alignItems: "center",
    flexDirection: "column",
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

const DRAFT_NOT_STARTED_MESSAGE = "Draft is not started yet";
const DRAFT_PICK_TIME_LIMIT_SECONDS = 10 * 60;

const Draft = ({ setTitle, myTeamId, seasonState, showMessage }) => {
  const classes = useStyles();
  const seasonContract = useRef(undefined);
  const teamContract = useRef(undefined);
  const playerContract = useRef(undefined);
  const utilsContract = useRef(undefined);
  const currentUser = useRef(undefined);

  const teamRanking = useRef([]);
  const countDownTimer = useRef(undefined);
  const draftRound = useRef(undefined);
  const currentPickTeam = useRef(undefined);

  const [draftPlayerList, setDraftPlayerList] = useState([]);
  const [progress, setProgress] = React.useState({ value: 0, timer: 0 });

  const updatePickTeam = useCallback(async () => {
    const currentPickStartTime = parseInt(
      await seasonContract.current.methods.currentPickStartTime().call()
    );
    let currentPickOrder = parseInt(
      await seasonContract.current.methods.currentPickOrder().call()
    );

    const rankings = teamRanking.current;
    const now = Math.floor(Date.now() / 1000);
    let timeSpan = now - currentPickStartTime;
    while (timeSpan > rankings.length * DRAFT_PICK_TIME_LIMIT_SECONDS) {
      timeSpan -= rankings.length * DRAFT_PICK_TIME_LIMIT_SECONDS;
      draftRound.current++;
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
  }, []);

  useEffect(() => {
    const init = async () => {
      window.ethereum.on("accountsChanged", (accounts) => {
        currentUser.current = accounts[0];
      });

      setTitle("Draft");
      // Get contracts instance.
      const contractsAndAccount = await getContractsAndAccount();
      seasonContract.current = contractsAndAccount.SeasonContract;
      teamContract.current = contractsAndAccount.TeamContract;
      playerContract.current = contractsAndAccount.PlayerContract;
      utilsContract.current = contractsAndAccount.UtilsContract;
      currentUser.current = contractsAndAccount.Account;
      await seasonContract.current.methods
        .GetTeamRanking()
        .call()
        .then((r) => (teamRanking.current = r));

      if (seasonState === "2") {
        await seasonContract.current.methods
          .draftRound()
          .call()
          .then((round) => (draftRound.current = parseInt(round)));
        await updatePickTeam();
      }
      await updateDraftPlayerList();
    };
    init();
  }, [myTeamId, seasonState, updatePickTeam, setTitle]);

  const updateDraftPlayerList = () => {
    seasonContract.current.methods
      .GetDraftPlayerList()
      .call()
      .then((playerIds) => {
        Promise.all(
          playerIds.map((id) =>
            playerContract.current.methods.GetPlayer(id).call()
          )
        ).then((players) => setDraftPlayerList(players.sort()));
      });
  };

  const handlePickPlayer = (id) => {
    teamContract.current.methods
      .DraftPlayer(id)
      .send({ from: currentUser.current })
      .then(() => {
        showMessage(`Drafted Player ${id} successfully`);
        updatePickTeam();
      })
      .catch((e) =>
        parseErrorCode(utilsContract.current, e.message).then((s) =>
          showMessage(s, true)
        )
      );
  };

  const displayDraftPlayers = () =>
    draftPlayerList.map((player, index) => (
      <ListItem key={index}>
        <Grid container className={classes.pick}>
          <Grid item>
            <Typography color="primary"> #{player.id}</Typography>
          </Grid>
          <Grid item>
            <PlayerDetail player={player} />
          </Grid>
          <Grid item>
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
    <Grid container className={classes.root}>
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
        <Grid item>
          <Paper elevation={3} className={classes.draft}>
            <Grid container>
              <Grid item xs={6}>
                <Typography variant="h6">Round</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="h6">Current Pick Team</Typography>
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
      {seasonState === "1" && seasonState === "2" && (
        <Grid item>
          <Typography color="primary">Prospect Players</Typography>
        </Grid>
      )}
      <Grid item>
        <List>{displayDraftPlayers()}</List>
      </Grid>
    </Grid>
  );
};

export default Draft;
