import React, { useState, useEffect, useRef } from "react";
import { makeStyles } from "@material-ui/core/styles";
import Accordion from "@material-ui/core/Accordion";
import AccordionSummary from "@material-ui/core/AccordionSummary";
import AccordionDetails from "@material-ui/core/AccordionDetails";
import Grid from "@material-ui/core/Grid";
import Typography from "@material-ui/core/Typography";

import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import PlayerIcon from "@material-ui/icons/Person";

import PlayerDetail from "./PlayerDetail";
import { getContractsAndAccount, parseErrorCode } from "./utils";

const useStyles = makeStyles((theme) => ({
  panelDetails: {},
  icon: {
    marginRight: theme.spacing(1),
  },
}));

const Players = ({ teamId, showMessage }) => {
  const classes = useStyles();
  const teamContract = useRef(undefined);
  const playerContract = useRef(undefined);
  const seasonContract = useRef(undefined);
  const utilsContract = useRef(undefined);
  const currentUser = useRef(undefined);
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    const updatePlayers = () => {
      teamContract.current.methods
        .GetTeamRosterIds(teamId)
        .call()
        .then((players) =>
          setPlayers(
            players.map((id) => {
              return { id: id };
            })
          )
        )
        .catch((e) =>
          parseErrorCode(utilsContract.current, e.message).then((s) =>
            showMessage(s, true)
          )
        );
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
  }, []);

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
      <Accordion key={index} onChange={showPlayerDetail(index, player.id)}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <PlayerIcon className={classes.icon} />
          <Typography variant="subtitle1">
            <strong>#{player.id}</strong>
          </Typography>
        </AccordionSummary>
        <AccordionDetails className={classes.panelDetails}>
          <PlayerDetail player={player} />
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
