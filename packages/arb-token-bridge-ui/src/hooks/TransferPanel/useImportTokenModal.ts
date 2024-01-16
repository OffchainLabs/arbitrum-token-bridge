import { useEffect } from 'react'
import { ImportTokenModalStatus } from '../../components/TransferPanel/TransferPanelUtils'
import { ConnectionState } from '../../util'
import { useTokenImportDialogStore } from '../../components/TransferPanel/TokenImportDialog'

export function useImportTokenModal({
  importTokenModalStatus,
  connectionState
}: {
  importTokenModalStatus: ImportTokenModalStatus
  connectionState: number
}) {
  const { openDialog: openTokenImportDialog } = useTokenImportDialogStore()
  useEffect(() => {
    if (importTokenModalStatus !== ImportTokenModalStatus.IDLE) {
      return
    }

    if (
      connectionState === ConnectionState.L1_CONNECTED ||
      connectionState === ConnectionState.L2_CONNECTED
    ) {
      openTokenImportDialog()
    }
  }, [connectionState, importTokenModalStatus, openTokenImportDialog])
}
