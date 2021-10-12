import React, { useState, useEffect } from "react";
import { gql } from "@apollo/client";
import { makeStyles } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import Chip from "@material-ui/core/Chip";
import Button from "@material-ui/core/Button";
import Typography from "@material-ui/core/Typography";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";

import SeasonPicker from "./SeasonPicker";

const useStyles = makeStyles((theme) => ({
  seasonPicker: {
    marginLeft: theme.spacing(1),
    minWidth: 80,
  },
  paper: {
    padding: theme.spacing(2),
    color: theme.palette.text.primary,
    opacity: 0.99,
  },
  cell: {
    margin: theme.spacing(0),
    padding: theme.spacing(0),
  },
  teamLink: {
    margin: theme.spacing(-1),
    padding: theme.spacing(0),
  },
}));

const Standings = ({
  seasonId,
  setTitle,
  showMessage,
  blobContracts,
  graph_client,
}) => {
  const classes = useStyles();
  const [season, setSeason] = useState(undefined);
  const [standings, setStandings] = useState([]);

  useEffect(() => {
    const teamRankingQuery = `
      query {
          teamStats(orderBy: winPct, orderDirection: desc,
                    where: {season: "${season}"}) {
            games
            team {
              teamId
              name
            }
            wins
            winPct
            streak
        }
      }
    `;
    if (season !== undefined)
      graph_client
        .query({
          query: gql(teamRankingQuery),
        })
        .then((data) => setStandings(data.data.teamStats))
        .catch((e) => showMessage(e.message, true));
  }, [season, showMessage, graph_client]);

  useEffect(() => {
    setTitle("Standings");
    if (graph_client !== null && seasonId !== undefined)
      setSeason(parseInt(seasonId));
  }, [seasonId, setTitle, graph_client]);

  const displayStandings = () =>
    standings.map((standing, index) => (
      <TableRow key={index}>
        <TableCell>
          <Chip label={index + 1} />
        </TableCell>
        <TableCell align="center" className={classes.cell}>
          <Button
            href={`../team/${standing.team.teamId}`}
            color="primary"
            className={classes.teamLink}
          >
            {standing.team.name}
          </Button>
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
            {standing.streak >= 0 ? "W" : "L"} {Math.abs(standing.streak)}
          </Typography>
        </TableCell>
      </TableRow>
    ));

  return (
    <div className="main-container">
      <Paper className={classes.paper}>
        {seasonId !== undefined && (
          <SeasonPicker
            styleClass={classes.seasonPicker}
            currentSeason={seasonId}
            seasons={[...Array(parseInt(seasonId)).keys()].map((k) => k + 1)}
            handleSeasonChange={(s) => setSeason(s)}
          />
        )}
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Rank</TableCell>
              <TableCell align="center">Team</TableCell>
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
