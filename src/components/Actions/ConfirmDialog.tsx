import React, { useCallback } from 'react'
import Button from '@material-ui/core/Button'
import Dialog from '@material-ui/core/Dialog'
import DialogActions from '@material-ui/core/DialogActions'
import DialogContent from '@material-ui/core/DialogContent'
import DialogContentText from '@material-ui/core/DialogContentText'
import DialogTitle from '@material-ui/core/DialogTitle'

export const useConfirmDialog = (
  _handleAccept: () => void,
  _handleReject?: () => void
) => {
  const [open, setDialogState] = React.useState(false)
  const handleClose = () => {
    setDialogState(false)
  }
  const handleAccept = useCallback(() => {
    handleClose()
    _handleAccept()
  }, [_handleAccept, handleClose])

  const handleReject = useCallback(() => {
    handleClose()
    _handleReject && handleReject()
  }, [_handleReject, handleClose])

  const setDialogOpen = () => {
    setDialogState(true)
  }

  return { setDialogOpen, handleAccept, handleReject, open, handleClose }
}

interface ConfirmDialogProps {
  open: boolean
  handleAccept: () => void
  handleReject: () => void
  handleClose: () => void
  dialogText: string
}

export default function ConfirmDialog({
  open,
  handleAccept,
  handleReject,
  handleClose,
  dialogText
}: ConfirmDialogProps) {
  return (
    <div>
      <Dialog
        open={open}
        onClose={handleClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            {dialogText}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleAccept} color="primary" autoFocus>
            Proceed
          </Button>
          <Button onClick={handleReject} color="primary">
            No Thanks
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}
