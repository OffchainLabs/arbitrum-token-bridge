import { useEffect } from 'react'
import { ImportTokenModalStatus } from '../../components/TransferPanel/TransferPanelUtils'
import { useTokenImportDialogStore } from '../../components/TransferPanel/TokenImportDialog'

export function useImportTokenModal({
  importTokenModalStatus
}: {
  importTokenModalStatus: ImportTokenModalStatus
}) {
  const { openDialog: openTokenImportDialog } = useTokenImportDialogStore()
  useEffect(() => {
    if (importTokenModalStatus !== ImportTokenModalStatus.IDLE) {
      return
    }

    openTokenImportDialog()
  }, [importTokenModalStatus, openTokenImportDialog])
}
