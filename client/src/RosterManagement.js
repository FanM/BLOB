import React, { useState, useRef, useEffect, useCallback } from "react";

import { withStyles } from "@material-ui/core/styles";
import Typography from "@material-ui/core/Typography";
import TableContainer from "@material-ui/core/TableContainer";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import Paper from "@material-ui/core/Paper";
import Grid from "@material-ui/core/Grid";
import Input from "@material-ui/core/Input";
import Switch from "@material-ui/core/Switch";
import Button from "@material-ui/core/Button";
import Slider from "@material-ui/core/Slider";
import Tooltip from "@material-ui/core/Tooltip";

import MoodIcon from "@material-ui/icons/Mood";
import MoodBadIcon from "@material-ui/icons/MoodBad";
import InjuryIcon from "@material-ui/icons/LocalHospital";
import { getContractsAndAccount, parseErrorCode } from "./utils";

const styles = (theme) => ({
  root: {
    display: "flex",
    justifyContent: "flex-start",
    flexDirection: "column",
    minWidth: 450,
  },
  title: { margin: theme.spacing(2), color: theme.palette.text.secondary },
  table: { minWidth: 450 },
  cell: { padding: "10px 5px 10px 10px" },
  icon: {
    marginLeft: 10,
  },
  teamButton: {
    marginLeft: 30,
  },
  rosterButton: {
    paddingRight: 10,
  },
  paper: {
    spacing: theme.spacing(1),
    margin: theme.spacing(1),
    padding: theme.spacing(2),
  },
  slider: {
    width: 100,
  },
  input: {
    marginLeft: 10,
    width: 45,
  },
  validIcon: {
    color: theme.palette.success.main,
  },
  invalidIcon: {
    color: theme.palette.error.main,
  },
});

const VALID_GAME_TIMES_MESSAGE = "Roster game times are valid";

const ValidIcon = withStyles(styles)(({ classes, invalidReason }) =>
  invalidReason === "" ? (
    <Tooltip title={VALID_GAME_TIMES_MESSAGE}>
      <MoodIcon className={classes.validIcon} />
    </Tooltip>
  ) : (
    <Tooltip title={invalidReason}>
      <MoodBadIcon className={classes.invalidIcon} />
    </Tooltip>
  )
);

const RosterManagement = withStyles(styles)(
  ({ classes, teamId, showMessage, showLoading }) => {
    const MAX_PLAY_TIME = 48;
    const MAX_SHOT_ALLOC = 50;

    const teamContract = useRef(undefined);
    const playerContract = useRef(undefined);
    const matchContract = useRef(undefined);
    const seasonContract = useRef(undefined);
    const utilsContract = useRef(undefined);

    const currentUser = useRef(undefined);
    const [playerGameTimes, setPlayerGameTimes] = useState([]);
    const [team3PShotPct, setTeam3PShotPct] = useState(0);
    const [gameTimeInvalidReason, setGameTimeInvalidReason] = useState("");

    const validateRosterGameTime = useCallback(
      (teamId) => {
        return matchContract.current.methods
          .ValidateTeamPlayerGameTime(teamId)
          .call()
          .then((errorCode) => {
            if (errorCode === "0") {
              setGameTimeInvalidReason("");
            } else {
              utilsContract.current.methods
                .errorCodeDescription(errorCode)
                .call()
                .then((s) => {
                  setGameTimeInvalidReason(s);
                  showMessage(s, true);
                });
            }
          });
      },
      [showMessage]
    );

    const updatePlayerGameTimes = useCallback(() => {
      seasonContract.current.methods
        .matchRound()
        .call()
        .then((currentRound) => {
          return teamContract.current.methods
            .GetTeamRosterIds(teamId)
            .call()
            .then((players) =>
              Promise.all(
                players
                  .sort((a, b) => a - b)
                  .map((playerId) =>
                    playerContract.current.methods
                      .CanPlay(playerId, currentRound)
                      .call()
                      .then((canPlay) =>
                        playerContract.current.methods
                          .GetPlayerGameTime(playerId)
                          .call()
                          .then((p) => {
                            return {
                              playerId: p.playerId,
                              playTime: p.playTime,
                              shotAllocation: p.shotAllocation,
                              shot3PAllocation: p.shot3PAllocation,
                              starter: p.starter,
                              canPlay: canPlay,
                            };
                          })
                      )
                  )
              ).then((playerGameTimes) => {
                setPlayerGameTimes(playerGameTimes);
                validateRosterGameTime(teamId);
              })
            )
            .catch((e) =>
              parseErrorCode(utilsContract.current, e.message).then((s) =>
                showMessage(s, true)
              )
            );
        });
    }, [teamId, validateRosterGameTime, showMessage]);

    const updateTeam3PShotPct = useCallback(() => {
      teamContract.current.methods
        .shot3PAllocation(teamId)
        .call()
        .then((pct) => {
          setTeam3PShotPct(pct);
        });
    }, [teamId]);

    useEffect(() => {
      const init = async () => {
        window.ethereum.on("accountsChanged", (accounts) => {
          currentUser.current = accounts[0];
          updatePlayerGameTimes();
        });

        // Get contracts instance.
        const contractsAndAccount = await getContractsAndAccount();
        teamContract.current = contractsAndAccount.TeamContract;
        seasonContract.current = contractsAndAccount.SeasonContract;
        playerContract.current = contractsAndAccount.PlayerContract;
        matchContract.current = contractsAndAccount.MatchContract;
        utilsContract.current = contractsAndAccount.UtilsContract;
        currentUser.current = contractsAndAccount.Account;
        await updateTeam3PShotPct();
        await updatePlayerGameTimes();
      };
      init();
    }, [updatePlayerGameTimes, updateTeam3PShotPct]);

    const handleStarterSwitch = (e, index) => {
      const newGameTimes = [...playerGameTimes];
      newGameTimes[index].starter = e.target.checked;
      setPlayerGameTimes(newGameTimes);
    };

    const handlePlayTimeInput = (e, index) => {
      const newGameTimes = [...playerGameTimes];
      if (e.target.value < 0) {
        newGameTimes[index].playTime = "0";
      } else if (e.target.value > MAX_PLAY_TIME) {
        newGameTimes[index].playTime = String(MAX_PLAY_TIME);
      } else {
        newGameTimes[index].playTime = String(e.target.value);
      }
      setPlayerGameTimes(newGameTimes);
    };

    const handleShotAllocInput = (e, index) => {
      const newGameTimes = [...playerGameTimes];
      const newVal = e.target.value;
      const newMax = Math.floor(
        (newGameTimes[index].playTime * 100) / MAX_PLAY_TIME
      );
      if (newVal < 0) {
        newGameTimes[index].shotAllocation = "0";
      } else if (newVal > newMax) {
        newGameTimes[index].shotAllocation = String(newMax);
      } else {
        newGameTimes[index].shotAllocation = String(newVal);
      }
      setPlayerGameTimes(newGameTimes);
    };

    const handleShot3PAllocInput = (e, index) => {
      const newGameTimes = [...playerGameTimes];
      const newVal = e.target.value;
      const newMax = Math.floor(
        (newGameTimes[index].playTime * 100) / MAX_PLAY_TIME
      );
      if (newVal < 0) {
        newGameTimes[index].shot3PAllocation = "0";
      } else if (newVal > newMax) {
        newGameTimes[index].shot3PAllocation = String(newMax);
      } else {
        newGameTimes[index].shot3PAllocation = String(newVal);
      }
      setPlayerGameTimes(newGameTimes);
    };

    const handleTeamShot3PAllocSlider = (e, newVal) => {
      setTeam3PShotPct(String(newVal));
    };
    const handleTeamShot3PAllocInput = (e) => {
      const newVal = e.target.value;
      if (newVal < 0) {
        setTeam3PShotPct("0");
      } else if (newVal > 100) {
        setTeam3PShotPct(String(100));
      } else {
        setTeam3PShotPct(String(newVal));
      }
    };

    const changePlayerGameTime = () => {
      showLoading(true);
      teamContract.current.methods
        .SetPlayersGameTime(playerGameTimes)
        .send({ from: currentUser.current })
        .then(() => {
          showMessage("Successfully set roster game times");
          updatePlayerGameTimes(teamId);
        })
        .catch((e) =>
          parseErrorCode(utilsContract.current, e.message).then((s) =>
            showMessage(s, true)
          )
        )
        .finally(() => showLoading(false));
    };

    const changeTeam3PShotAlloc = () => {
      showLoading(true);
      teamContract.current.methods
        .SetTeamShot3PAllocation(team3PShotPct)
        .send({ from: currentUser.current })
        .then(() => {
          showMessage("Successfully set team 3P shot percentage");
          updateTeam3PShotPct();
        })
        .catch((e) =>
          parseErrorCode(utilsContract.current, e.message).then((s) =>
            showMessage(s, true)
          )
        )
        .finally(() => showLoading(false));
    };

    const displayPlayerGameTimes = () =>
      playerGameTimes.map((gameTime, index) => (
        <TableRow key={index}>
          <TableCell className={classes.cell}>{gameTime.playerId}</TableCell>
          <TableCell className={classes.cell}>
            <Switch
              size="small"
              color="primary"
              checked={gameTime.starter}
              onChange={(e) => handleStarterSwitch(e, index)}
            />
          </TableCell>
          <TableCell className={classes.cell}>
            <Input
              className={classes.input}
              value={gameTime.playTime}
              onChange={(e) => handlePlayTimeInput(e, index)}
              inputProps={{
                step: 1,
                min: 0,
                max: MAX_PLAY_TIME,
                type: "number",
              }}
            />
          </TableCell>
          <TableCell className={classes.cell}>
            <Input
              className={classes.input}
              value={gameTime.shotAllocation}
              onChange={(e) => handleShotAllocInput(e, index)}
              inputProps={{
                step: 1,
                min: 0,
                max: MAX_SHOT_ALLOC,
                type: "number",
              }}
            />
          </TableCell>
          <TableCell className={classes.cell}>
            <Input
              className={classes.input}
              value={gameTime.shot3PAllocation}
              onChange={(e) => handleShot3PAllocInput(e, index)}
              inputProps={{
                step: 1,
                min: 0,
                max: MAX_SHOT_ALLOC,
                type: "number",
              }}
            />
          </TableCell>
          <TableCell className={classes.cell}>
            {!gameTime.canPlay ? <InjuryIcon color="secondary" /> : null}
          </TableCell>
        </TableRow>
      ));

    return (
      <Grid container className={classes.root}>
        <Grid item>
          <Typography variant="subtitle1" className={classes.title}>
            Team 3P Shot Percentage
          </Typography>
        </Grid>
        <Grid item>
          <Paper elevation={3} className={classes.paper}>
            <Grid container justifyContent="space-around">
              <Grid item xs={2}>
                <Slider
                  className={classes.slider}
                  value={
                    typeof team3PShotPct === "string"
                      ? Number(team3PShotPct)
                      : 0
                  }
                  min={0}
                  max={100}
                  onChange={handleTeamShot3PAllocSlider}
                />
              </Grid>
              <Grid item xs={2}>
                <Input
                  className={classes.input}
                  value={team3PShotPct}
                  onChange={handleTeamShot3PAllocInput}
                  inputProps={{
                    step: 1,
                    min: 0,
                    max: 100,
                    type: "number",
                  }}
                />
              </Grid>
              <Grid item>
                <Button
                  className={classes.teamButton}
                  color="primary"
                  onClick={changeTeam3PShotAlloc}
                >
                  <Typography variant="subtitle2">Change</Typography>
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
        <Grid item>
          <Typography variant="subtitle1" className={classes.title}>
            Adjust Roster Play Time
          </Typography>
        </Grid>
        <Grid item>
          <Paper elevation={3} className={classes.paper}>
            <Grid container justifyContent="space-around">
              <Grid item xs={4} className={classes.icon}>
                <ValidIcon invalidReason={gameTimeInvalidReason} />
              </Grid>
              <Grid item>
                <Button
                  className={classes.rosterButton}
                  color="primary"
                  onClick={changePlayerGameTime}
                >
                  <Typography variant="subtitle2">Change</Typography>
                </Button>
              </Grid>
            </Grid>
            <TableContainer component={Paper} className={classes.table}>
              <Table>
                <TableHead>
                  <TableRow align="right">
                    <TableCell className={classes.cell}>ID</TableCell>
                    <TableCell className={classes.cell}>Starter</TableCell>
                    <TableCell className={classes.cell}>Play Time</TableCell>
                    <TableCell className={classes.cell}>2P Pct</TableCell>
                    <TableCell className={classes.cell}>3P Pct</TableCell>
                    <TableCell className={classes.cell}>Injury</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>{displayPlayerGameTimes()}</TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    );
  }
);

export default RosterManagement;
