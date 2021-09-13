import React, { useState, useEffect } from "react";
import { makeStyles } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import Chip from "@material-ui/core/Chip";
import Typography from "@material-ui/core/Typography";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";

const useStyles = makeStyles((theme) => ({
  paper: {
    padding: theme.spacing(2),
    color: theme.palette.text.primary,
  },
}));

const Standings = ({ setTitle, blobContracts }) => {
  const classes = useStyles();
  const [standings, setStandings] = useState([]);

  useEffect(() => {
    const init = async () => {
      setTitle("Standings");
      const standings = await blobContracts.SeasonContract.methods
        .GetTeamRanking()
        .call();
      const rankings = [];
      for (let i = 0; i < standings.length; i++) {
        const games = await blobContracts.SeasonContract.methods
          .teamWins(standings[i], 0)
          .call();
        const wins = await blobContracts.SeasonContract.methods
          .teamWins(standings[i], 1)
          .call();
        const winStreak = await blobContracts.SeasonContract.methods
          .teamMomentum(standings[i])
          .call();

        rankings.push({
          rank: i + 1,
          team: standings[i],
          games: games,
          wins: wins,
          winStreak: winStreak,
        });
      }
      setStandings(rankings);
    };
    if (blobContracts !== null) init();
  }, [setTitle, blobContracts]);

  const displayStandings = () =>
    standings.map((standing, index) => (
      <TableRow key={index}>
        <TableCell>
          <Chip label={standing.rank} />
        </TableCell>
        <TableCell align="center">
          <Typography>{standing.team}</Typography>
        </TableCell>
        <TableCell align="right">
          <Typography>{standing.games}</Typography>
        </TableCell>
        <TableCell align="right">
          <Typography>{standing.wins}</Typography>
        </TableCell>
        <TableCell align="right">
          <Typography>{standing.games - standing.wins}</Typography>
        </TableCell>
        <TableCell align="right">
          <Typography>
            {standing.winStreak >= 0 ? "W" : "L"} {Math.abs(standing.winStreak)}
          </Typography>
        </TableCell>
      </TableRow>
    ));

  return (
    <div className="main-container">
      <Paper className={classes.paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Rank</TableCell>
              <TableCell>Team</TableCell>
              <TableCell align="right">GP</TableCell>
              <TableCell align="right">W</TableCell>
              <TableCell align="right">L</TableCell>
              <TableCell align="right">Streak</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>{displayStandings()}</TableBody>
        </Table>
      </Paper>
    </div>
  );
};

export default Standings;
