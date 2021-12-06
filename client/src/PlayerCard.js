import React from "react";
import { LinkContainer } from "react-router-bootstrap";

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
  cell: {
    padding: theme.spacing(0.5),
    marginLeft: theme.spacing(1),
    marginRight: theme.spacing(2),
    minWidth: 50,
    borderBottom: "none",
  },
});

const PlayerAttributesTable = ({ classes, player, langObj }) => {
  return (
    <TableContainer component={Paper} elevation={3} className={classes.table}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell align="center" className={classes.cell}>
              {langObj.playerAttributes.TABLE_HEADER_AGE}
            </TableCell>
            <TableCell align="center" className={classes.cell}>
              {langObj.playerAttributes.TABLE_HEADER_FITNESS}
            </TableCell>
            <TableCell align="center" className={classes.cell}>
              {langObj.playerAttributes.TABLE_HEADER_MATURITY}
            </TableCell>
            <TableCell align="center" className={classes.cell}>
              {langObj.playerAttributes.TABLE_HEADER_FIELD_GOAL}
            </TableCell>
            <TableCell align="center" className={classes.cell}>
              {langObj.playerAttributes.TABLE_HEADER_3_POINT}
            </TableCell>
            <TableCell align="center" className={classes.cell}>
              {langObj.playerAttributes.TABLE_HEADER_ASSIST}
            </TableCell>
            <TableCell align="center" className={classes.cell}>
              {langObj.playerAttributes.TABLE_HEADER_REBOUND}
            </TableCell>
            <TableCell align="center" className={classes.cell}>
              {langObj.playerAttributes.TABLE_HEADER_BLOCK}
            </TableCell>
            <TableCell align="center" className={classes.cell}>
              {langObj.playerAttributes.TABLE_HEADER_STEAL}
            </TableCell>
            <TableCell align="center" className={classes.cell}>
              {langObj.playerAttributes.TABLE_HEADER_FREE_THROW}
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow key={0}>
            <TableCell align="center" className={classes.cell}>
              {player.age}
            </TableCell>
            <TableCell align="center" className={classes.cell}>
              {player.physicalStrength}
            </TableCell>
            <TableCell align="center" className={classes.cell}>
              {player.maturity}
            </TableCell>
            <TableCell align="center" className={classes.cell}>
              {player.shot}
            </TableCell>
            <TableCell align="center" className={classes.cell}>
              {player.shot3Point}
            </TableCell>
            <TableCell align="center" className={classes.cell}>
              {player.assist}
            </TableCell>
            <TableCell align="center" className={classes.cell}>
              {player.rebound}
            </TableCell>
            <TableCell align="center" className={classes.cell}>
              {player.blockage}
            </TableCell>
            <TableCell align="center" className={classes.cell}>
              {player.steal}
            </TableCell>
            <TableCell align="center" className={classes.cell}>
              {player.freeThrow}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  );
};

const PlayerCard = withStyles(styles)(
  ({ classes, player, langObj, handlePick, disablePick }) => {
    return (
      <Grid container justifyContent="center">
        <Card elevation={1} style={{ width: 325 }} className={classes.card}>
          <CardHeader
            title={`#${player.playerId}`}
            subheader={langObj.playerCard.POSITIONS[player.position].name}
            avatar={
              <Avatar>
                <FaceIcon />
              </Avatar>
            }
          />
          <CardContent>
            <Grid container justifyContent="center">
              <PlayerAttributesTable
                classes={classes}
                player={player}
                langObj={langObj}
              />
            </Grid>
          </CardContent>
          <CardActions>
            {handlePick === undefined && (
              <LinkContainer to={`/player/${player.playerId}`}>
                <Button className={classes.profile} color="primary">
                  {langObj.playerCard.PLAYER_CARD_MORE_BUTTON}
                </Button>
              </LinkContainer>
            )}
            {handlePick !== undefined && (
              <Button
                className={classes.profile}
                color="primary"
                onClick={handlePick}
                disabled={disablePick}
              >
                {langObj.draft.DRAFT_PICK_PLAYER_BUTTON}
              </Button>
            )}
          </CardActions>
        </Card>
      </Grid>
    );
  }
);

export { PlayerCard, PlayerAttributesTable };
