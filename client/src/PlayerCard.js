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
    margin: theme.spacing(1),
    padding: theme.spacing(0),
  },
  profile: {
    marginLeft: "auto",
    marginRight: theme.spacing(2),
    marginTop: theme.spacing(-1),
    marginBottom: theme.spacing(-1),
  },
  cell: { borderBottom: "none" },
});

const POSITIONS = [
  {
    name: "Center",
    shortName: "C",
  },
  {
    name: "Power Forward",
    shortName: "PF",
  },

  {
    name: "Small Forward",
    shortName: "SF",
  },
  {
    name: "Point Guard",
    shortName: "PG",
  },
  {
    name: "Shooting Guard",
    shortName: "SG",
  },
];

const PlayerStatsTable = ({ classes, player }) => {
  return (
    <TableContainer component={Paper} elevation={3} className={classes.table}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell align="left" className={classes.cell}>
              AGE
            </TableCell>
            <TableCell align="left" className={classes.cell}>
              FIT
            </TableCell>
            <TableCell align="left" className={classes.cell}>
              MTY
            </TableCell>
            <TableCell align="left" className={classes.cell}>
              2PT
            </TableCell>
            <TableCell align="left" className={classes.cell}>
              3PT
            </TableCell>
            <TableCell align="left" className={classes.cell}>
              AST
            </TableCell>
            <TableCell align="left" className={classes.cell}>
              REB
            </TableCell>
            <TableCell align="left" className={classes.cell}>
              BLK
            </TableCell>
            <TableCell align="left" className={classes.cell}>
              STL
            </TableCell>
            <TableCell align="left" className={classes.cell}>
              FT
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow key={0}>
            <TableCell align="left" className={classes.cell}>
              {player.age}
            </TableCell>
            <TableCell align="left" className={classes.cell}>
              {player.physicalStrength}
            </TableCell>
            <TableCell align="left" className={classes.cell}>
              {player.maturity}
            </TableCell>
            <TableCell align="left" className={classes.cell}>
              {player.shot}
            </TableCell>
            <TableCell align="left" className={classes.cell}>
              {player.shot3Point}
            </TableCell>
            <TableCell align="left" className={classes.cell}>
              {player.assist}
            </TableCell>
            <TableCell align="left" className={classes.cell}>
              {player.rebound}
            </TableCell>
            <TableCell align="left" className={classes.cell}>
              {player.blockage}
            </TableCell>
            <TableCell align="left" className={classes.cell}>
              {player.steal}
            </TableCell>
            <TableCell align="left" className={classes.cell}>
              {player.freeThrow}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  );
};

const PlayerCard = withStyles(styles)(
  ({ classes, player, handlePick, disablePick }) => {
    return (
      <Grid container justifyContent="center">
        <Card elevation={1} style={{ width: 325 }} className={classes.card}>
          <CardHeader
            title={`#${player.playerId}`}
            subheader={POSITIONS[player.position].name}
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
            {handlePick === undefined && (
              <Button
                href={`../player/${player.playerId}`}
                className={classes.profile}
                color="primary"
              >
                more
              </Button>
            )}
            {handlePick !== undefined && (
              <Button
                className={classes.profile}
                color="primary"
                onClick={handlePick}
                disabled={disablePick}
              >
                pick
              </Button>
            )}
          </CardActions>
        </Card>
      </Grid>
    );
  }
);

export { PlayerCard, PlayerStatsTable, POSITIONS };
