import React from "react";

import { withStyles } from "@material-ui/core/styles";
import Card from "@material-ui/core/Card";
import CardHeader from "@material-ui/core/CardHeader";
import CardContent from "@material-ui/core/CardContent";
import Avatar from "@material-ui/core/Avatar";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import Paper from "@material-ui/core/Paper";
import FaceIcon from "@material-ui/icons/Face";

const styles = (theme) => ({
  root: {
    margin: theme.spacing(2),
    flexDirection: "row",
    overflow: "auto",
  },
  card: {
    maxWidth: 450,
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
    <Paper className={classes.root}>
      <Table>
        <TableHead>
          <TableRow align="right">
            <TableCell>AGE</TableCell>
            <TableCell>STH</TableCell>
            <TableCell>2PT</TableCell>
            <TableCell>3PT</TableCell>
            <TableCell>AST</TableCell>
            <TableCell>REB</TableCell>
            <TableCell>BLK</TableCell>
            <TableCell>STL</TableCell>
            <TableCell>FT</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow key={0}>
            <TableCell align="right">{player.age}</TableCell>
            <TableCell align="right">{player.physicalStrength}</TableCell>
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
    </Paper>
  );
};

const PlayerDetail = withStyles(styles)(({ classes, player }) => {
  return (
    <Card className={classes.card}>
      <CardHeader
        title={player.name === "" ? "Unknown" : player.name}
        subheader={POSITIONS[player.position]}
        avatar={
          <Avatar>
            <FaceIcon />
          </Avatar>
        }
      />
      <CardContent>
        <PlayerStatsTable classes={classes} player={player} />
      </CardContent>
    </Card>
  );
});

export default PlayerDetail;
