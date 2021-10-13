import React from "react";

import { makeStyles } from "@material-ui/styles";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import Dialog from "@material-ui/core/Dialog";
import LinearProgress from "@material-ui/core/LinearProgress";

const useStyles = makeStyles((theme) => ({
  dialog: { minHeight: 200 },
  select: { width: "100%" },
}));

const MaybeLinearProgress = ({ loading, ...props }) =>
  loading ? <LinearProgress {...props} /> : null;

export default function LoadingDialog({ open, message }) {
  const classes = useStyles();

  return (
    <Dialog
      open={open}
      classes={{ paper: classes.dialog }}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle>{message}</DialogTitle>
      <DialogContent>
        <MaybeLinearProgress loading={true} />
      </DialogContent>
    </Dialog>
  );
}
