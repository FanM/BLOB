import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import compose from "recompose/compose";
import { gql } from "@apollo/client";

import { withStyles } from "@material-ui/core/styles";
import withWidth from "@material-ui/core/withWidth";
import Card from "@material-ui/core/Card";
import CardHeader from "@material-ui/core/CardHeader";
import CardContent from "@material-ui/core/CardContent";
import CardActions from "@material-ui/core/CardActions";
import Collapse from "@material-ui/core/Collapse";
import Grid from "@material-ui/core/Grid";
import Button from "@material-ui/core/Button";
import IconButton from "@material-ui/core/IconButton";
import TextField from "@material-ui/core/TextField";
import Typography from "@material-ui/core/Typography";
import Avatar from "@material-ui/core/Avatar";

import TeamIcon from "@material-ui/icons/People";
import ExpandMoreIcon from "@material-ui/icons/CardGiftcard";
import ExpandLessIcon from "@material-ui/icons/ExpandLess";

import { ManagementTabContainer, ManagmentTabContent } from "./AbstractTabs";
import Players from "./Players";
import RosterManagement from "./RosterManagement";
import { parseErrorCode } from "./utils";

const styles = (theme) => ({
  root: {
    backgroundColor: theme.palette.background.paper,
  },
  card: {
    flexGrow: 1,
    margin: theme.spacing(0),
    marginBottom: theme.spacing(1),
    padding: theme.spacing(-1),
  },
  text: {
    margin: theme.spacing(1),
    marginBottom: theme.spacing(1),
    color: theme.palette.text.secondary,
  },
  transferTitle: {
    margin: theme.spacing(1),
    marginBottom: theme.spacing(-1),
  },
  expand: {
    marginLeft: "auto",
    marginRight: "5vw",
  },
  transfer: {
    justifyContent: "center",
    alignItems: "center",
    textAlign: "center",
  },
  addressField: {
    minWidth: 350,
  },
});

const ExpandIcon = ({ expanded }) =>
  expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />;

const TeamManagementBar = ({
  classes,
  width,
  myTeamId,
  matchRound,
  setTitle,
  showMessage,
  showLoading,
  blobContracts,
  currentUser,
  graph_client,
}) => {
  let { teamId } = useParams();
  const [teamInfo, setTeamInfo] = useState({ joinedSeason: "" });
  const [expanded, setExpanded] = useState(false);
  const [receiverAddress, setReceiverAddress] = useState({
    id: "receiver",
    label: "Receiver Address",
    value: "",
    error: false,
    helperText: "Any valid address that can hold ERC721 token",
    getHelperText: (error) =>
      error
        ? "Not a valid address"
        : "Any valid address that can hold ERC721 token",
  });

  useEffect(() => {
    const getTeamInfo = () => {
      const teamListQuery = `
        query{
          teams(where: {teamId: ${teamId}}){
            teamId,
            name,
            owner,
            joinedSeason {
              seasonId
            },
            champions
          }
        }
      `;
      return graph_client
        .query({
          query: gql(teamListQuery),
        })
        .then((data) => data.data.teams[0]);
    };
    if (graph_client !== null && blobContracts !== null)
      getTeamInfo()
        .then((team) => {
          if (team) {
            setTitle(team.name);
            setTeamInfo(team);
          }
        })
        .catch((e) => showMessage(e.message, true));
  }, [setTitle, showMessage, teamId, graph_client, blobContracts]);

  const toggleExpanded = () => setExpanded(!expanded);

  const onAddressChange = ({ target: { id, value } }) => {
    const newAddress = { ...receiverAddress };
    const isValid = blobContracts.Web3.utils.isAddress(value);
    newAddress.value = value;
    newAddress.error = !isValid;
    newAddress.helperText = receiverAddress.getHelperText(!isValid);
    setReceiverAddress(newAddress);
  };

  const handleTransfer = () => {
    showLoading(true);
    blobContracts.TeamContract.methods
      .safeTransferFrom(currentUser, receiverAddress.value, myTeamId)
      .send({ from: currentUser })
      .then(() => {
        showMessage("Successfully claimed a team");
        return blobContracts.TeamContract.methods.GetTeams().call();
      })
      .catch((e) => {
        parseErrorCode(blobContracts.UtilsContract, e.message).then((s) =>
          showMessage(s, true)
        );
      })
      .finally(() => showLoading(false));
  };

  return (
    <div className={classes.root}>
      <Card elevation={3} className={classes.card}>
        <CardHeader
          title={teamInfo.name}
          subheader={teamInfo.teamId}
          avatar={
            <Avatar>
              <TeamIcon />
            </Avatar>
          }
        />
        <CardContent>
          <Grid container justifyContent="flex-start">
            <Grid item xs={6}>
              <Typography className={classes.text}>
                Joined Season: <strong>{teamInfo.joinedSeason.seasonId}</strong>
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography className={classes.text}>
                Total Champions: <strong>{teamInfo.champions}</strong>
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body2" className={classes.text}>
                Owner: {teamInfo.owner}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
        <CardActions disableSpacing>
          <IconButton
            className={classes.expand}
            onClick={toggleExpanded}
            disabled={myTeamId !== teamId}
          >
            <ExpandIcon expanded={expanded} />
          </IconButton>
        </CardActions>
        <Collapse in={expanded}>
          <CardContent>
            <Grid container className={classes.transfer}>
              <Grid item xs={12}>
                <Typography
                  variant="subtitle1"
                  color="secondary"
                  className={classes.transferTitle}
                >
                  TRANSFER THIS TEAM TO OTHER ONE
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  id={receiverAddress.id}
                  label={receiverAddress.label}
                  helperText={receiverAddress.helperText}
                  value={receiverAddress.value}
                  onChange={onAddressChange}
                  error={receiverAddress.error}
                  margin="normal"
                  variant="outlined"
                  className={classes.addressField}
                  fullWidth
                />
              </Grid>

              <Grid item xs={4}>
                <Button
                  onClick={handleTransfer}
                  disabled={receiverAddress.error}
                  color="primary"
                >
                  Transfer
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Collapse>
      </Card>
      <ManagementTabContainer>
        <ManagmentTabContent label="Players">
          <Players
            teamId={teamId}
            showMessage={showMessage}
            graph_client={graph_client}
          />
        </ManagmentTabContent>
        <ManagmentTabContent
          disabled={currentUser === null}
          label="Roster Management"
        >
          <RosterManagement
            teamId={teamId}
            matchRound={matchRound}
            showMessage={showMessage}
            showLoading={showLoading}
            blobContracts={blobContracts}
            currentUser={currentUser}
            graph_client={graph_client}
          />
        </ManagmentTabContent>
      </ManagementTabContainer>
    </div>
  );
};

export default compose(withWidth(), withStyles(styles))(TeamManagementBar);
