import { useEffect } from 'react'
import { ImportTokenModalStatus } from '../../components/TransferPanel/TransferPanelUtils'
import { ConnectionState } from '../../util'

export function useConnectionState({
  importTokenModalStatus,
  connectionState,
  setImportTokenModalStatus
}: {
  importTokenModalStatus: ImportTokenModalStatus
  connectionState: number
  setImportTokenModalStatus: (value: any) => void
}) {
  useEffect(() => {
    if (importTokenModalStatus !== ImportTokenModalStatus.IDLE) {
      return
    }

    if (
      connectionState === ConnectionState.L1_CONNECTED ||
      connectionState === ConnectionState.L2_CONNECTED
    ) {
      setImportTokenModalStatus(ImportTokenModalStatus.OPEN)
    }
  }, [connectionState, importTokenModalStatus, setImportTokenModalStatus])
}
