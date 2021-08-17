import React, { useState, useRef, useEffect } from "react";

import { withStyles } from "@material-ui/core/styles";
import Typography from "@material-ui/core/Typography";
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

import MoodIcon from "@material-ui/icons/Mood";
import MoodBadIcon from "@material-ui/icons/MoodBad";
import InjuryIcon from "@material-ui/icons/LocalHospital";
import { getContractsAndAccount, parseErrorCode } from "./utils";

const styles = (theme) => ({
  root: { margin: theme.spacing(2) },
  icon: {
    marginLeft: 10,
  },
  button: {
    marginLeft: "auto",
  },
});

const ValidIcon = ({ valid }) =>
  valid ? <MoodIcon /> : <MoodBadIcon color="secondary" />;

const RosterManagement = withStyles(styles)(({ classes, teamId }) => {
  const MAX_PLAY_TIME = 48;
  const MAX_SHOT_ALLOC = 50;

  const teamContract = useRef(undefined);
  const playerContract = useRef(undefined);
  const matchContract = useRef(undefined);
  const seasonContract = useRef(undefined);
  const utilsContract = useRef(undefined);

  const currentUser = useRef(undefined);
  const [playerGameTimes, setPlayerGameTimes] = useState([]);
  const [gameTimeValid, setGameTimeValid] = useState(true);

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
      await updatePlayerGameTimes();
    };
    init();
  }, []);

  const updatePlayerGameTimes = () => {
    seasonContract.current.methods
      .matchRound()
      .call()
      .then((currentRound) => {
        return teamContract.current.methods
          .GetTeamRosterIds(teamId)
          .call()
          .then((players) =>
            Promise.all(
              players.map((playerId) =>
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
              return validateRosterGameTime(teamId);
            })
          )
          .catch((e) =>
            parseErrorCode(utilsContract.current, e.message).then((s) =>
              alert(s)
            )
          );
      });
  };

  const validateRosterGameTime = (teamId) => {
    return matchContract.current.methods
      .ValidateTeamPlayerGameTime(teamId)
      .call()
      .then((errorCode) => {
        if (errorCode === "0") {
          setGameTimeValid(true);
        } else {
          setGameTimeValid(false);
          utilsContract.current.methods
            .errorCodeDescription(errorCode)
            .call()
            .then((s) => console.log(s));
        }
      });
  };
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

  const changePlayerGameTime = () => {
    teamContract.current.methods
      .SetPlayersGameTime(playerGameTimes)
      .send({ from: currentUser.current })
      .then(() => updatePlayerGameTimes(teamId))
      .catch((e) =>
        parseErrorCode(utilsContract.current, e.message).then((s) => alert(s))
      );
  };

  const displayPlayerGameTimes = () =>
    playerGameTimes.map((gameTime, index) => (
      <TableRow key={index}>
        <TableCell>{gameTime.playerId}</TableCell>
        <TableCell align="right">
          <Switch
            size="small"
            color="primary"
            checked={gameTime.starter}
            onChange={(e) => handleStarterSwitch(e, index)}
          />
        </TableCell>
        <TableCell align="right">
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
        <TableCell align="right">
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
        <TableCell align="right">
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
        <TableCell align="right">
          {!gameTime.canPlay ? <InjuryIcon color="secondary" /> : null}
        </TableCell>
      </TableRow>
    ));

  return (
    <div className="validate-roster-container">
      <Grid container justifyContent="space-around" spacing={4}>
        <Grid item className={classes.icon}>
          <ValidIcon valid={gameTimeValid} />
        </Grid>
        <Grid item>
          <Button
            className={classes.button}
            variant="outlined"
            color="primary"
            onClick={changePlayerGameTime}
          >
            <Typography>Change</Typography>
          </Button>
        </Grid>
      </Grid>
      <Paper className={classes.root}>
        <Table>
          <TableHead>
            <TableRow align="right">
              <TableCell>ID</TableCell>
              <TableCell>Starter</TableCell>
              <TableCell>Play Time</TableCell>
              <TableCell>2P Allocation</TableCell>
              <TableCell>3P Allocation</TableCell>
              <TableCell>Injury</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>{displayPlayerGameTimes()}</TableBody>
        </Table>
      </Paper>
    </div>
  );
});

export default RosterManagement;
