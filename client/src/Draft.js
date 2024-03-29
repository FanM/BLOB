import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  Fragment,
} from "react";
import { gql } from "@apollo/client";
import { makeStyles } from "@material-ui/core/styles";
import Grid from "@material-ui/core/Grid";
import Paper from "@material-ui/core/Paper";
import Typography from "@material-ui/core/Typography";

import DraftUnavailableIcon from "@material-ui/icons/Block";

import { parseErrorCode } from "./utils";
import { PlayerCard } from "./PlayerCard";
import CountdownCircle from "./CountdownCircle";

const useStyles = makeStyles((theme) => ({
  paper: {
    margin: theme.spacing(5),
    padding: theme.spacing(2),
    paddingBottom: theme.spacing(0),
    textAlign: "center",
    maxWidth: "300",
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
  text: {
    color: theme.palette.text.secondary,
  },
}));

const DRAFT_PICK_TIME_LIMIT_SECONDS = 10 * 60;

const Draft = ({
  setTitle,
  myTeamId,
  season,
  showMessage,
  showLoading,
  blobContracts,
  currentUser,
  graph_client,
  langObj,
}) => {
  const classes = useStyles();

  const teamRanking = useRef([]);
  const countDownTimer = useRef(undefined);
  const draftRound = useRef(undefined);
  const currentPickTeam = useRef({});

  const [draftPlayerList, setDraftPlayerList] = useState([]);
  const [progress, setProgress] = useState({ value: 0, timer: 0 });
  const [draftDate, setDraftDate] = useState({ value: 0, timer: 0 });

  const setDraftStartDate = useCallback(() => {
    const queryLastGame = `
      query {
        games(orderBy: gameId, orderDirection: desc
              seaon:${season.seasonId}, first: 1){
          scheduledTime,
          season {
            seasonId
          },
        }
      }
      `;
    return graph_client
      .query({
        query: gql(queryLastGame),
      })
      .then((data) => {
        if (data !== null) {
          const lastGameDate = new Date(
            data.data.games[0].scheduledTime * 1000
          );
          const draftDate = new Date();
          draftDate.setUTCDate(lastGameDate.getUTCDate() + 1);
          draftDate.setUTCHours(2);
          draftDate.setUTCMinutes(0);
          draftDate.setUTCSeconds(0);
          setDraftDate(draftDate);
        }
      });
  }, [season.seasonId, graph_client]);

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

    let updatedPickTeam = rankings[rankings.length - currentPickOrder - 1];
    if (updatedPickTeam !== currentPickTeam.current.id) {
      currentPickTeam.current = await blobContracts.TeamContract.methods
        .GetTeam(updatedPickTeam)
        .call();
      setProgress({
        timer: DRAFT_PICK_TIME_LIMIT_SECONDS - timeSpan,
        value: 0,
      });
      updateDraftPlayerList();

      if (countDownTimer.current !== undefined)
        clearInterval(countDownTimer.current);

      const endTime = now + DRAFT_PICK_TIME_LIMIT_SECONDS - timeSpan;
      countDownTimer.current = setInterval(() => {
        const secondsLeft = endTime - Math.floor(Date.now() / 1000);
        if (secondsLeft <= 0) {
          // clears the current timer
          clearInterval(countDownTimer.current);
          updatePickTeam();
        }
        if (secondsLeft % 5 === 0) updatePickTeam();

        setProgress((prevProgress) => {
          return {
            timer: secondsLeft,
            value: Math.round(
              (100 * prevProgress.timer) / DRAFT_PICK_TIME_LIMIT_SECONDS
            ),
          };
        });
      }, 1000);
    }
  }, [updateDraftPlayerList, blobContracts]);

  useEffect(() => {
    const init = async () => {
      if (season.seasonState !== 3) {
        setDraftStartDate();
      }
      if (season.seasonState === 2) {
        await blobContracts.SeasonContract.methods
          .GetTeamRanking()
          .call()
          .then((r) => (teamRanking.current = r));
        await updatePickTeam();
      }
      await updateDraftPlayerList();
    };
    setTitle(langObj.mainMenuItems.MAIN_MENU_DRAFT);
    if (blobContracts !== null && graph_client !== null) init();
  }, [
    myTeamId,
    season.seasonState,
    updatePickTeam,
    updateDraftPlayerList,
    setDraftStartDate,
    setTitle,
    blobContracts,
    currentUser,
    graph_client,
    langObj,
  ]);

  const handlePickPlayer = (id) => {
    showLoading(true);
    blobContracts.TeamContract.methods
      .DraftPlayer(id)
      .send({ from: currentUser })
      .then(() => {
        showMessage(langObj.errorDesc.CONTRACT_OPERATION_SUCCEEDED);
        updatePickTeam();
      })
      .catch((e) =>
        showMessage(parseErrorCode(langObj.errorDesc, e.reason), true)
      )
      .finally(() => showLoading(false));
  };

  const displayDraftPlayers = () => (
    <Grid container className={classes.pick}>
      {draftPlayerList.map((player, index) => (
        <Grid item xs={12} md={6} key={index}>
          <PlayerCard
            player={{ playerId: player.id, ...player }}
            langObj={langObj}
            handlePick={() => handlePickPlayer(player.id)}
            disablePick={currentPickTeam.current.id !== myTeamId}
          />
        </Grid>
      ))}
    </Grid>
  );

  return (
    <Grid container justifyContent="center">
      {season.seasonState !== 2 && (
        <Grid container className={classes.no_draft}>
          <Grid item>
            <DraftUnavailableIcon color="secondary" />
          </Grid>
          <Grid item>
            <Typography className={classes.text}>
              {langObj.draft.DRAFT_WILL_START_MESSAGE}
            </Typography>
          </Grid>
          <Grid item>
            <Typography className={classes.text}>
              <strong>{draftDate.toLocaleString()}</strong>
            </Typography>
          </Grid>
        </Grid>
      )}
      {season.seasonState === 2 && (
        <Paper elevation={3} className={classes.paper}>
          <Grid container>
            <Grid item xs={6}>
              <Typography variant="subtitle2" color="primary">
                {langObj.draft.DRAFT_ROUND_LABEL}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="subtitle2" color="primary">
                {langObj.draft.DRAFT_PICK_TEAM_LABEL}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="h6" color="primary">
                <strong>{draftRound.current}</strong>
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="h6" color="primary">
                <strong>{currentPickTeam.current.name}</strong>
              </Typography>
            </Grid>
            <Grid container className={classes.timer}>
              <Grid item>
                <CountdownCircle value={{ ...progress, size: 80 }} />
              </Grid>
              <Grid item>
                <Typography variant="body2" className={classes.text}>
                  {langObj.draft.DRAFT_COUNTDOWN_LABEL}
                </Typography>
              </Grid>
            </Grid>
          </Grid>
        </Paper>
      )}
      {(season.seasonState === 1 || season.seasonState === 2) && (
        <Fragment>
          <Grid item xs={12}>
            <Typography
              align="center"
              variant="subtitle2"
              className={classes.text}
            >
              {langObj.draft.DRAFT_PROSPECT_PLAYER_LABEL}
            </Typography>
          </Grid>
          <Grid item xs={12}>
            {displayDraftPlayers()}
          </Grid>
        </Fragment>
      )}
    </Grid>
  );
};

export default Draft;
