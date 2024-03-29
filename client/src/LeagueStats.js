import React, { useEffect, useState } from "react";
import { LinkContainer } from "react-router-bootstrap";
import { gql } from "@apollo/client";
import PropTypes from "prop-types";
import { makeStyles } from "@material-ui/core/styles";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableContainer from "@material-ui/core/TableContainer";
import TableHead from "@material-ui/core/TableHead";
import TablePagination from "@material-ui/core/TablePagination";
import TableRow from "@material-ui/core/TableRow";
import TableSortLabel from "@material-ui/core/TableSortLabel";
import Paper from "@material-ui/core/Paper";
import Grid from "@material-ui/core/Grid";
import InputAdornment from "@material-ui/core/InputAdornment";
import TextField from "@material-ui/core/TextField";
import Button from "@material-ui/core/Button";
import IconButton from "@material-ui/core/IconButton";

import SearchIcon from "@material-ui/icons/Search";
import ClearIcon from "@material-ui/icons/Clear";

import SeasonPicker from "./SeasonPicker";

function EnhancedTableHead(props) {
  const { classes, order, orderBy, onRequestSort, langObj } = props;
  const createSortHandler = (property) => (event) => {
    onRequestSort(event, property);
  };

  const headCells = [
    {
      id: "name",
      numeric: false,
      disablePadding: true,
      label: "#",
    },
    {
      id: "games",
      numeric: true,
      disablePadding: false,
      label: langObj.playerStats.TABLE_HEADER_GAME_PLAYED,
    },
    {
      id: "minAvg",
      numeric: true,
      disablePadding: false,
      label: langObj.playerStats.TABLE_HEADER_MINUTES,
    },
    {
      id: "ptsAvg",
      numeric: true,
      disablePadding: false,
      label: langObj.playerStats.TABLE_HEADER_POINTS,
    },
    {
      id: "fggPct",
      numeric: true,
      disablePadding: false,
      label: langObj.playerStats.TABLE_HEADER_FIELD_GOAL_PCT,
    },
    {
      id: "tpgPct",
      numeric: true,
      disablePadding: false,
      label: langObj.playerStats.TABLE_HEADER_3_POINT_PCT,
    },
    {
      id: "ftgPct",
      numeric: true,
      disablePadding: false,
      label: langObj.playerStats.TABLE_HEADER_FREE_THROW_PCT,
    },
    {
      id: "rebAvg",
      numeric: true,
      disablePadding: false,
      label: langObj.playerStats.TABLE_HEADER_REBOUNDS,
    },
    {
      id: "astAvg",
      numeric: true,
      disablePadding: false,
      label: langObj.playerStats.TABLE_HEADER_ASSISTS,
    },
    {
      id: "blkAvg",
      numeric: true,
      disablePadding: false,
      label: langObj.playerStats.TABLE_HEADER_BLOCKS,
    },
    {
      id: "stlAvg",
      numeric: true,
      disablePadding: false,
      label: langObj.playerStats.TABLE_HEADER_STEALS,
    },
  ];

  return (
    <TableHead>
      <TableRow>
        {headCells.map((headCell) => (
          <TableCell
            className={classes.cell}
            key={headCell.id}
            align={headCell.numeric ? "right" : "center"}
            padding={headCell.disablePadding ? "none" : "normal"}
          >
            <TableSortLabel
              className={classes.sortCell}
              disabled={!headCell.numeric}
              active={orderBy === headCell.id}
              direction={orderBy === headCell.id ? order : "desc"}
              onClick={createSortHandler(headCell.id)}
            >
              {headCell.label}
              {orderBy === headCell.id ? (
                <span className={classes.visuallyHidden}>
                  {order === "desc" ? "sorted descending" : "sorted ascending"}
                </span>
              ) : null}
            </TableSortLabel>
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  );
}

EnhancedTableHead.propTypes = {
  classes: PropTypes.object.isRequired,
  onRequestSort: PropTypes.func.isRequired,
  order: PropTypes.oneOf(["asc", "desc"]).isRequired,
  orderBy: PropTypes.string.isRequired,
};

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    margin: theme.spacing(1),
  },
  paper: {
    flexGrow: 1,
    margin: theme.spacing(0),
    padding: theme.spacing(1),
    opacity: 0.99,
  },
  cell: {
    padding: theme.spacing(0),
    margin: theme.spacing(-1),
  },
  sortCell: {
    padding: theme.spacing(0),
    marginLeft: theme.spacing(-2),
    marginRight: theme.spacing(1),
    marginBottom: theme.spacing(1),
    minWidth: 60,
  },
  search: { margin: theme.spacing(2) },
  seasonPicker: { marginBottom: theme.spacing(2) },
  searchIcon: {
    color: theme.palette.text.secondary,
  },
  playerLink: {
    margin: theme.spacing(-1),
    padding: theme.spacing(0),
  },
  visuallyHidden: {
    border: 0,
    clip: "rect(0 0 0 0)",
    height: 1,
    margin: -1,
    overflow: "hidden",
    padding: 0,
    position: "absolute",
    top: 20,
    width: 1,
  },
}));

export default function EnhancedTable({
  seasonId,
  setTitle,
  showMessage,
  graph_client,
  langObj,
}) {
  const classes = useStyles();
  const [season, setSeason] = useState(undefined);
  const [order, setOrder] = useState("desc");
  const [orderBy, setOrderBy] = useState("ptsAvg");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [items, setItems] = useState({ count: -1, list: [] });
  const [searchText, setSearchText] = useState("");

  const handleRequestSort = (event, property) => {
    const isAsc = orderBy === property && order === "desc";
    setOrder(isAsc ? "asc" : "desc");
    setOrderBy(property);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  useEffect(() => {
    const getPlayerStats = (playerFilter) => {
      const playerStatsQuery = `
      query {
        playerStats(orderBy: ${orderBy},
                    orderDirection: ${order},
                    where: {season: "${season}" ${playerFilter}},
                    skip: ${page * rowsPerPage},
                    first: ${rowsPerPage}) {
          games
          player {
            playerId
          }
          minAvg
          ptsAvg
          fggPct
          tpgPct
          ftgPct
          rebAvg
          astAvg
          blkAvg
          stlAvg
        }
      }
      `;
      return graph_client
        .query({
          query: gql(playerStatsQuery),
        })
        .then((data) => data.data.playerStats)
        .catch((e) => showMessage(e.message, true));
    };
    if (season !== undefined) {
      const totalCount = page * rowsPerPage + rowsPerPage;
      let playerFilter = "";
      if (searchText !== "") playerFilter = `, player: "${searchText}"`;
      getPlayerStats(playerFilter).then((stats) => {
        const count =
          rowsPerPage === stats.length
            ? -1
            : totalCount - rowsPerPage + stats.length;
        setItems({ list: stats, count: count });
      });
    }
  }, [
    season,
    showMessage,
    searchText,
    page,
    order,
    orderBy,
    rowsPerPage,
    graph_client,
  ]);

  const onSearchChange = (e) => {
    setSearchText(e.target.value);
  };

  useEffect(() => {
    setTitle(langObj.mainMenuItems.MAIN_MENU_PLAYER_STATS);
    if (graph_client !== null && seasonId !== undefined) setSeason(seasonId);
  }, [seasonId, setTitle, graph_client, langObj]);

  return (
    <div className={classes.root}>
      <Grid container>
        <Grid container alignItems="flex-start">
          <Grid item>
            <TextField
              placeholder={langObj.playerStats.PLAYER_ID_INPUT}
              onChange={onSearchChange}
              className={classes.search}
              value={searchText}
              id="input-search"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon className={classes.searchIcon} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <IconButton
                    onClick={() => setSearchText("")}
                    className={classes.searchIcon}
                  >
                    <InputAdornment position="end">
                      <ClearIcon />
                    </InputAdornment>
                  </IconButton>
                ),
              }}
            />
          </Grid>
          <Grid item>
            {seasonId !== undefined && (
              <SeasonPicker
                styleClass={classes.seasonPicker}
                currentSeason={seasonId}
                seasons={[...Array(parseInt(seasonId)).keys()].map(
                  (k) => k + 1
                )}
                langObj={langObj}
                handleSeasonChange={(s) => setSeason(s)}
              />
            )}
          </Grid>
        </Grid>
        <Paper style={{ width: 300 }} className={classes.paper}>
          <TableContainer>
            <Table
              className={classes.table}
              aria-labelledby="tableTitle"
              aria-label="enhanced table"
            >
              <EnhancedTableHead
                classes={classes}
                order={order}
                orderBy={orderBy}
                onRequestSort={handleRequestSort}
                langObj={langObj}
              />
              <TableBody>
                {items.list.map((row, index) => {
                  const labelId = `enhanced-table-button-${index}`;

                  return (
                    <TableRow hover tabIndex={-1} key={index}>
                      <TableCell
                        component="th"
                        id={labelId}
                        scope="row"
                        padding="none"
                        margin="none"
                      >
                        <LinkContainer to={`/player/${row.player.playerId}`}>
                          <Button
                            color="primary"
                            className={classes.playerLink}
                          >
                            {row.player.playerId}
                          </Button>
                        </LinkContainer>
                      </TableCell>
                      <TableCell align="right">{row.games}</TableCell>
                      <TableCell align="right">
                        {(Math.round(row.minAvg * 10) / 10).toFixed(1)}
                      </TableCell>
                      <TableCell align="right">
                        {(Math.round(row.ptsAvg * 10) / 10).toFixed(1)}
                      </TableCell>
                      <TableCell align="right">
                        {(Math.round(row.fggPct * 1000) / 10).toFixed(1)}
                      </TableCell>
                      <TableCell align="right">
                        {(Math.round(row.tpgPct * 1000) / 10).toFixed(1)}
                      </TableCell>
                      <TableCell align="right">
                        {(Math.round(row.ftgPct * 1000) / 10).toFixed(1)}
                      </TableCell>
                      <TableCell align="right">
                        {(Math.round(row.rebAvg * 10) / 10).toFixed(1)}
                      </TableCell>
                      <TableCell align="right">
                        {(Math.round(row.astAvg * 10) / 10).toFixed(1)}
                      </TableCell>
                      <TableCell align="right">
                        {(Math.round(row.blkAvg * 10) / 10).toFixed(1)}
                      </TableCell>
                      <TableCell align="right">
                        {(Math.round(row.stlAvg * 10) / 10).toFixed(1)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[5, 10, 15]}
            component="div"
            count={items.count}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Paper>
      </Grid>
    </div>
  );
}
