import React, { useState, useEffect } from "react";
import { LinkContainer } from "react-router-bootstrap";
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
  headerCell: {
    padding: theme.spacing(0.5),
    marginLeft: theme.spacing(1),
    marginRight: theme.spacing(2),
    minWidth: 40,
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
  langObj,
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
    setTitle(langObj.mainMenuItems.MAIN_MENU_STANDINGS);
    if (graph_client !== null && seasonId !== undefined)
      setSeason(parseInt(seasonId));
  }, [seasonId, setTitle, graph_client, langObj]);

  const displayStandings = () =>
    standings.map((standing, index) => (
      <TableRow key={index}>
        <TableCell>
          <Chip label={index + 1} />
        </TableCell>
        <TableCell align="center" className={classes.cell}>
          <LinkContainer to={`/team/${standing.team.teamId}`}>
            <Button color="primary" className={classes.teamLink}>
              {standing.team.name}
            </Button>
          </LinkContainer>
        </TableCell>
        <TableCell align="center">
          <Typography>{standing.games}</Typography>
        </TableCell>
        <TableCell align="center">
          <Typography>{standing.wins}</Typography>
        </TableCell>
        <TableCell align="center">
          <Typography>{standing.games - standing.wins}</Typography>
        </TableCell>
        <TableCell align="center">
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
            langObj={langObj}
            handleSeasonChange={(s) => setSeason(s)}
          />
        )}
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{langObj.standings.TABLE_HEADER_RANK}</TableCell>
              <TableCell align="center" className={classes.headerCell}>
                {langObj.standings.TABLE_HEADER_TEAM}
              </TableCell>
              <TableCell align="center" className={classes.headerCell}>
                {langObj.standings.TABLE_HEADER_GAME_PLAYED}
              </TableCell>
              <TableCell align="center" className={classes.headerCell}>
                {langObj.standings.TABLE_HEADER_WINS}
              </TableCell>
              <TableCell align="center" className={classes.headerCell}>
                {langObj.standings.TABLE_HEADER_LOSSES}
              </TableCell>
              <TableCell align="center" className={classes.headerCell}>
                {langObj.standings.TABLE_HEADER_STREAK}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>{displayStandings()}</TableBody>
        </Table>
      </Paper>
    </div>
  );
};

export default Standings;
