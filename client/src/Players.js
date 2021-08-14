import React, { useState, useEffect, useRef } from "react";
import { makeStyles } from "@material-ui/core/styles";
import Accordion from "@material-ui/core/Accordion";
import AccordionSummary from "@material-ui/core/AccordionSummary";
import AccordionDetails from "@material-ui/core/AccordionDetails";
import Grid from "@material-ui/core/Grid";
import Typography from "@material-ui/core/Typography";

import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import PlayerIcon from "@material-ui/icons/Person";
import InjuryIcon from "@material-ui/icons/LocalHospital";

import { getContractsAndAccount, parseErrorCode } from "./utils";

const useStyles = makeStyles((theme) => ({
  panelDetails: {
    flexDirection: "column",
    height: 150,
    overflow: "auto",
  },
  icon: {
    marginRight: theme.spacing(1),
  },
  injuryIcon: {
    marginLeft: theme.spacing(30),
  },
}));

const Players = (props) => {
  const classes = useStyles();
  const teamContract = useRef(undefined);
  const playerContract = useRef(undefined);
  const seasonContract = useRef(undefined);
  const utilsContract = useRef(undefined);
  const currentUser = useRef(undefined);
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    const updatePlayers = async () => {
      try {
        const players = await teamContract.current.methods
          .GetTeamRosterIds(props.teamId)
          .call();
        const currentRound = await seasonContract.current.methods
          .matchRound()
          .call();
        const decoratedPlayers = await Promise.all(
          players.map(async (playerId) => {
            const canPlay = await playerContract.current.methods
              .CanPlay(playerId, currentRound)
              .call();
            return { id: playerId, canPlay: canPlay };
          })
        );
        setPlayers(decoratedPlayers);
      } catch (e) {
        alert(await parseErrorCode(utilsContract.current, e.message));
      }
    };

    const init = async () => {
      window.ethereum.on("accountsChanged", (accounts) => {
        currentUser.current = accounts[0];
        updatePlayers();
      });

      // Get contracts instance.
      const contractsAndAccount = await getContractsAndAccount();
      teamContract.current = contractsAndAccount.TeamContract;
      playerContract.current = contractsAndAccount.PlayerContract;
      seasonContract.current = contractsAndAccount.SeasonContract;
      utilsContract.current = contractsAndAccount.UtilsContract;
      currentUser.current = contractsAndAccount.Account;
      await updatePlayers();
    };
    init();
  }, [props.teamId]);

  const showPlayerDetail = (index, playerId) => (e, expanded) => {
    if (!players[index].name && expanded) {
      playerContract.current.methods
        .GetPlayer(playerId)
        .call()
        .then((player) => {
          const newPlayers = [...players];
          newPlayers[index] = { ...newPlayers[index], ...player };
          setPlayers(newPlayers);
        });
    }
  };

  const displayPlayers = () => {
    return players.map((player, index) => (
      <Accordion key={player.id} onChange={showPlayerDetail(index, player.id)}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <PlayerIcon className={classes.icon} />
          <Typography variant="subtitle1">
            <strong>#{player.id}</strong>
          </Typography>
          {!player.canPlay ? (
            <InjuryIcon className={classes.injuryIcon} color="secondary" />
          ) : null}
        </AccordionSummary>
        <AccordionDetails className={classes.panelDetails}>
          <Typography>
            Name: {player.name === "" ? "Unknown" : player.name} Position:{" "}
            {player.position} Age: {player.age} Shot Percentage: {player.shot}{" "}
            3P Shot Percentage: {player.shot3Point} Next Available Round:{" "}
            <strong>{player.nextAvailableRound}</strong>
          </Typography>
        </AccordionDetails>
      </Accordion>
    ));
  };

  return (
    <div className="main-container">
      <div className="match-schedules-container">
        <Grid container justifyContent="space-around" spacing={4}>
          {displayPlayers()}
        </Grid>
      </div>
    </div>
  );
};

export default Players;
