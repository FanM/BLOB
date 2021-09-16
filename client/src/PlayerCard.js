import React from "react";

import { withStyles } from "@material-ui/core/styles";
import Card from "@material-ui/core/Card";
import CardHeader from "@material-ui/core/CardHeader";
import CardContent from "@material-ui/core/CardContent";
import CardActions from "@material-ui/core/CardActions";
import Avatar from "@material-ui/core/Avatar";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableContainer from "@material-ui/core/TableContainer";
import TableCell from "@material-ui/core/TableCell";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import Paper from "@material-ui/core/Paper";
import Grid from "@material-ui/core/Grid";
import Button from "@material-ui/core/Button";
import FaceIcon from "@material-ui/icons/Face";

const styles = (theme) => ({
  table: {
    margin: theme.spacing(0),
    marginBottom: theme.spacing(-2),
    overflow: "auto",
  },
  card: {
    flexGrow: 1,
    marginLeft: theme.spacing(0),
    padding: theme.spacing(-1),
  },
  profile: {
    marginLeft: "auto",
    marginRight: theme.spacing(2),
    marginTop: theme.spacing(-1),
    marginBottom: theme.spacing(-1),
  },
});

const POSITIONS = [
  "Center",
  "Power Forward",
  "Small Forward",
  "Point Guard",
  "Shooting Guard",
];

const PlayerStatsTable = ({ classes, player }) => {
  return (
    <TableContainer component={Paper} className={classes.table}>
      <Table>
        <TableHead>
          <TableRow align="right">
            <TableCell align="right">AGE</TableCell>
            <TableCell align="right">STH</TableCell>
            <TableCell align="right">MTY</TableCell>
            <TableCell align="right">2PT</TableCell>
            <TableCell align="right">3PT</TableCell>
            <TableCell align="right">AST</TableCell>
            <TableCell align="right">REB</TableCell>
            <TableCell align="right">BLK</TableCell>
            <TableCell align="right">STL</TableCell>
            <TableCell align="right">FT</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow key={0}>
            <TableCell align="right">{player.age}</TableCell>
            <TableCell align="right">{player.physicalStrength}</TableCell>
            <TableCell align="right">{player.maturity}</TableCell>
            <TableCell align="right">{player.shot}</TableCell>
            <TableCell align="right">{player.shot3Point}</TableCell>
            <TableCell align="right">{player.assist}</TableCell>
            <TableCell align="right">{player.rebound}</TableCell>
            <TableCell align="right">{player.blockage}</TableCell>
            <TableCell align="right">{player.steal}</TableCell>
            <TableCell align="right">{player.freeThrow}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  );
};

const PlayerCard = withStyles(styles)(({ classes, player }) => {
  return (
    <Grid container justifyContent="center">
      <Card elevation={3} style={{ width: 325 }} className={classes.card}>
        <CardHeader
          title={`#${player.playerId}`}
          subheader={POSITIONS[player.position]}
          avatar={
            <Avatar>
              <FaceIcon />
            </Avatar>
          }
        />
        <CardContent>
          <Grid container justifyContent="center">
            <PlayerStatsTable classes={classes} player={player} />
          </Grid>
        </CardContent>
        <CardActions>
          <Button
            href={`../player/${player.playerId}`}
            className={classes.profile}
            color="primary"
          >
            more
          </Button>
        </CardActions>
      </Card>
    </Grid>
  );
});

export { PlayerCard, POSITIONS };