import React, { useEffect, useState } from 'react';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';

interface props {
    networkId: number
    l2Network: string
}
export default function AlertDialog({networkId, l2Network}: props) {
  const [open, setOpen] = useState(false);
  const [showAlert, setShowAlert] = useState(true)

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  useEffect(()=>{
    if (!showAlert) return
    if (networkId == 152709604825713){
        handleClickOpen();
        setShowAlert(false);
    }
  },[networkId, l2Network])
  return (
    <div>
      <Dialog
        open={open}
        onClose={handleClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">{"Note"}</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
          You are using our old testnet, which does not support withdrawals. To test withdrawing from Arbitrum, please use our latest, upgraded, "v3" testnet (recommended). 

          <br/> <br/> Reach out to on <a href="https://discord.gg/ZpZuw7p" target="_blank"> discord </a>for further assistance.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="primary">
            Got it
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}