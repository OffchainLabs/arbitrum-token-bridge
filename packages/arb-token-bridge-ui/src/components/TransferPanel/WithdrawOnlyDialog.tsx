import { useActions, useAppState } from '../../state'
import { Dialog } from '../common/Dialog'
import { useWithdrawOnlyDialogStore } from './TransferPanelMain'

export function WithdrawOnlyDialog() {
  const { app } = useAppState()
  const { selectedToken } = app
  const {
    app: { setSelectedToken }
  } = useActions()
  const {
    isOpen: isOpenWithdrawOnlyDialog,
    closeDialog: closeWithdrawOnlyDialog
  } = useWithdrawOnlyDialogStore()
  const unsupportedToken = selectedToken?.symbol ?? 'this token'

  const onClose = () => {
    setSelectedToken(null)
    closeWithdrawOnlyDialog()
  }

  return (
    <Dialog
      closeable
      title="Token cannot be bridged here"
      cancelButtonProps={{ className: 'hidden' }}
      actionButtonTitle="Close"
      isOpen={isOpenWithdrawOnlyDialog}
      onClose={onClose}
      className="md:max-w-[628px]"
    >
      <p>
        Unfortunately, <span className="font-medium">{unsupportedToken}</span>{' '}
        has a custom bridge solution that is incompatible with the canonical
        Arbitrum bridge. For more information please contact{' '}
        <span className="font-medium">{unsupportedToken}</span>
        &apos;s developer team directly or explore their docs.
      </p>
    </Dialog>
  )
}
