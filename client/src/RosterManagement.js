import React, { useState, useEffect, useCallback, Fragment } from "react";
import { gql } from "@apollo/client";

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
import Radio from "@material-ui/core/Radio";
import Button from "@material-ui/core/Button";
import Slider from "@material-ui/core/Slider";
import Collapse from "@material-ui/core/Collapse";
import IconButton from "@material-ui/core/IconButton";

import InjuryIcon from "@material-ui/icons/LocalHospital";
import ResetIcon from "@material-ui/icons/Replay";
import { PlayerStatsTable, POSITIONS } from "./PlayerCard";
import { parseErrorCode } from "./utils";

const styles = (theme) => ({
  root: {
    display: "flex",
    justifyContent: "flex-start",
  },
  title: { margin: theme.spacing(1), color: theme.palette.text.secondary },
  table: {
    marginTop: theme.spacing(1),
    maxHeight: 600,
  },
  icon: {
    marginLeft: 10,
  },
  container: {
    justifyContent: "space-around",
    alignItems: "center",
  },
  teamButton: {
    marginLeft: 30,
  },
  rosterButton: {
    paddingRight: 10,
  },
  paper: {
    flexGrow: 1,
    margin: theme.spacing(0),
    padding: theme.spacing(1),
  },
  slider: {
    width: 100,
    marginLeft: 10,
  },
  validIcon: {
    color: theme.palette.success.main,
  },
  invalidIcon: {
    color: theme.palette.error.main,
  },
});

const VALID_GAME_TIMES_MESSAGE = "Roster Game Times Are Valid";

const ValidLabel = withStyles(styles)(({ classes, invalidReason }) =>
  invalidReason === "" ? (
    <Typography className={classes.validIcon}>
      {VALID_GAME_TIMES_MESSAGE}
    </Typography>
  ) : (
    <Typography className={classes.invalidIcon}>{invalidReason}</Typography>
  )
);

const rowStyles = (theme) => ({
  cell: { padding: "10px 5px 10px 10px", borderBottom: "none" },
  attribCell: {
    paddingTop: 0,
    paddingBottom: 0,
  },
  attriTable: {
    size: "small",
  },
  input: {
    marginLeft: 10,
    width: 45,
  },
  injuryIcon: {
    color: theme.palette.error.main,
  },
  playerButton: {
    margin: theme.spacing(-1),
    padding: theme.spacing(0),
  },
});

const MAX_PLAY_TIME = 48;
const MAX_SHOT_ALLOC = 25;

const PlayerRow = withStyles(rowStyles)(
  ({
    classes,
    position,
    rowSpan,
    gameTime,
    player,
    index,
    handleStarterSwitch,
    handlePlayTimeInput,
    handleShotAllocInput,
    handleShot3PAllocInput,
    resetPlayerGameTime,
  }) => {
    const [open, setOpen] = useState(false);

    return (
      <Fragment>
        <TableRow key={index}>
          {rowSpan && (
            <TableCell rowSpan={2 * rowSpan}>
              {POSITIONS[position].shortName}
            </TableCell>
          )}
          <TableCell className={classes.cell}>
            <Button
              size="small"
              className={classes.playerButton}
              onClick={() => setOpen(!open)}
            >
              <Typography color={open ? "secondary" : "primary"}>
                {gameTime.playerId}
              </Typography>
              {!gameTime.canPlay ? (
                <InjuryIcon className={classes.injuryIcon} />
              ) : null}
            </Button>
          </TableCell>
          <TableCell className={classes.cell}>
            <Radio
              size="small"
              color="primary"
              checked={gameTime.starter}
              onChange={(e) => handleStarterSwitch(e, index, position)}
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
            <IconButton
              size="small"
              onClick={(e) => resetPlayerGameTime(e, index, position)}
            >
              <ResetIcon />
            </IconButton>
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell className={classes.attribCell} colSpan={6}>
            <Collapse in={open} timeout="auto" unmountOnExit>
              <PlayerStatsTable classes={classes} player={player} />
            </Collapse>
          </TableCell>
        </TableRow>
      </Fragment>
    );
  }
);

const RosterManagement = withStyles(styles)(
  ({
    classes,
    teamId,
    matchRound,
    showMessage,
    showLoading,
    blobContracts,
    currentUser,
    graph_client,
  }) => {
    const [players, setPlayers] = useState([]);
    const [playerGameTimes, setPlayerGameTimes] = useState([]);
    const [positionMapping, setPositionMapping] = useState([]);
    const [team3PShotPct, setTeam3PShotPct] = useState(0);
    const [gameTimeInvalidReason, setGameTimeInvalidReason] = useState("");

    const validateRosterGameTime = useCallback(
      (teamId) => {
        return blobContracts.MatchContract.methods
          .ValidateTeamPlayerGameTime(teamId)
          .call()
          .then((errorCode) => {
            if (errorCode === "0") {
              setGameTimeInvalidReason("");
            } else {
              blobContracts.UtilsContract.methods
                .errorCodeDescription(errorCode)
                .call()
                .then((s) => {
                  setGameTimeInvalidReason(s);
                });
            }
          });
      },
      [blobContracts]
    );

    const updatePlayerGameTimes = useCallback(() => {
      const getPlayerList = () => {
        const playerListQuery = `
        query {
          players(orderBy: playerId, where: {team: "${teamId}"}){
            playerId,
            position,
            age,
            physicalStrength,
            maturity,
            shot,
            shot3Point,
            assist,
            rebound,
            blockage,
            steal,
            freeThrow
            nextAvailableRound,
            retired
          }
        }
      `;
        return graph_client
          .query({
            query: gql(playerListQuery),
          })
          .then((data) => data.data.players)
          .catch((e) => showMessage(e.message, true));
      };

      getPlayerList()
        .then((players) =>
          Promise.all(
            players.map((player) => {
              const canPlay =
                !player.retired && matchRound >= player.nextAvailableRound;
              return blobContracts.PlayerContract.methods
                .GetPlayerGameTime(player.playerId)
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
                });
            })
          ).then((playerGameTimes) => {
            let posMapping = [[], [], [], [], []];
            players.map((player, index) =>
              posMapping[player.position].push(index)
            );
            setPlayers(players);
            setPlayerGameTimes(playerGameTimes);
            setPositionMapping(posMapping);
            validateRosterGameTime(teamId);
          })
        )
        .catch((e) =>
          parseErrorCode(blobContracts.UtilsContract, e.message).then((s) =>
            showMessage(s, true)
          )
        );
    }, [
      teamId,
      matchRound,
      validateRosterGameTime,
      showMessage,
      blobContracts,
      graph_client,
    ]);

    const updateTeam3PShotPct = useCallback(() => {
      blobContracts.TeamContract.methods
        .shot3PAllocation(teamId)
        .call()
        .then((pct) => {
          setTeam3PShotPct(pct);
        });
    }, [teamId, blobContracts]);

    useEffect(() => {
      const init = () => {
        updateTeam3PShotPct();
        updatePlayerGameTimes();
      };
      if (
        blobContracts !== null &&
        graph_client != null &&
        matchRound !== undefined
      )
        init();
    }, [
      updatePlayerGameTimes,
      updateTeam3PShotPct,
      matchRound,
      blobContracts,
      graph_client,
    ]);

    const handleStarterSwitch = (e, index, position) => {
      const newGameTimes = [...playerGameTimes];
      newGameTimes[index].starter = e.target.checked;
      positionMapping[position].forEach((i) => {
        if (i !== index) newGameTimes[i].starter = false;
      });
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

    const resetPlayerGameTime = (e, index, position) => {
      const newGameTimes = [...playerGameTimes];
      if (newGameTimes[index].starter) {
        const positionArr = positionMapping[position];
        const newStarterIndex =
          (positionArr.indexOf(index) + 1) % positionArr.length;
        newGameTimes[positionArr[newStarterIndex]].starter = true;
      }
      newGameTimes[index].starter = false;
      newGameTimes[index].playTime = 0;
      newGameTimes[index].shotAllocation = 0;
      newGameTimes[index].shot3PAllocation = 0;
      setPlayerGameTimes(newGameTimes);
    };

    const changePlayerGameTime = () => {
      showLoading(true);
      blobContracts.TeamContract.methods
        .SetPlayersGameTime(playerGameTimes)
        .send({ from: currentUser })
        .then(() => {
          showMessage("Successfully set roster game times");
          updatePlayerGameTimes(teamId);
        })
        .catch((e) =>
          parseErrorCode(blobContracts.UtilsContract, e.message).then((s) =>
            showMessage(s, true)
          )
        )
        .finally(() => showLoading(false));
    };

    const changeTeam3PShotAlloc = () => {
      showLoading(true);
      blobContracts.TeamContract.methods
        .SetTeamShot3PAllocation(team3PShotPct)
        .send({ from: currentUser })
        .then(() => {
          showMessage("Successfully set team 3P shot percentage");
          updateTeam3PShotPct();
        })
        .catch((e) =>
          parseErrorCode(blobContracts.utilsContract, e.message).then((s) =>
            showMessage(s, true)
          )
        )
        .finally(() => showLoading(false));
    };

    const displayPlayerGameTimes = () =>
      positionMapping.map((position, i) =>
        position.map((index, j) => (
          <PlayerRow
            key={j}
            position={i}
            rowSpan={j === 0 ? position.length : undefined}
            gameTime={playerGameTimes[index]}
            player={players[index]}
            index={index}
            handleStarterSwitch={handleStarterSwitch}
            handlePlayTimeInput={handlePlayTimeInput}
            handleShotAllocInput={handleShotAllocInput}
            handleShot3PAllocInput={handleShot3PAllocInput}
            resetPlayerGameTime={resetPlayerGameTime}
          />
        ))
      );

    return (
      <Grid container className={classes.root}>
        <Grid item xs={12}>
          <Typography variant="subtitle1" className={classes.title}>
            Team 3 Point Shot Percentage
          </Typography>
        </Grid>
        <Grid item xs={12}>
          <Paper elevation={3} className={classes.paper}>
            <Grid container className={classes.container}>
              <Grid item>
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
              <Grid item>
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
        <Grid item xs={12}>
          <Typography variant="subtitle1" className={classes.title}>
            Adjust Roster Play Time
          </Typography>
        </Grid>
        <Paper elevation={3} style={{ width: 330 }} className={classes.paper}>
          <Grid container item xs={12} className={classes.container}>
            <Grid item className={classes.icon}>
              <ValidLabel invalidReason={gameTimeInvalidReason} />
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
          <Grid item xs={12}>
            <TableContainer component={Paper} className={classes.table}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell align="left" className={classes.cell}>
                      Pos
                    </TableCell>
                    <TableCell align="left" className={classes.cell}>
                      ID
                    </TableCell>
                    <TableCell align="left" className={classes.cell}>
                      Starter
                    </TableCell>
                    <TableCell align="left" className={classes.cell}>
                      Min
                    </TableCell>
                    <TableCell align="left" className={classes.cell}>
                      2P%
                    </TableCell>
                    <TableCell align="left" className={classes.cell}>
                      3P%
                    </TableCell>
                    <TableCell align="left" className={classes.cell}>
                      Reset
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>{displayPlayerGameTimes()}</TableBody>
              </Table>
            </TableContainer>
          </Grid>
        </Paper>
      </Grid>
    );
  }
);

export default RosterManagement;
