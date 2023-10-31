import { useMemo } from 'react'

import { useIsSwitchingL2Chain } from '../../components/TransferPanel/TransferPanelMainUtils'
import { useAppContextState } from '../../components/App/AppContext'
import { useAppState } from '../../state'
import { GasEstimationStatus } from '../../components/TransferPanel/TransferPanelSummary'

export function useSummaryVisibility({
  disableDeposit,
  disableWithdrawal,
  gasEstimationStatus
}: {
  disableDeposit: boolean
  disableWithdrawal: boolean
  gasEstimationStatus: GasEstimationStatus
}) {
  const {
    app: { isDepositMode }
  } = useAppState()

  const {
    layout: { isTransferring }
  } = useAppContextState()

  const isSwitchingL2Chain = useIsSwitchingL2Chain()

  const isSummaryVisible = useMemo(() => {
    if (isSwitchingL2Chain || gasEstimationStatus === 'error') {
      return false
    }

    if (isTransferring) {
      return true
    }

    return !(isDepositMode ? disableDeposit : disableWithdrawal)
  }, [
    isSwitchingL2Chain,
    gasEstimationStatus,
    isTransferring,
    isDepositMode,
    disableDeposit,
    disableWithdrawal
  ])

  console.log({ isSummaryVisible, disableDeposit, disableWithdrawal })

  return {
    isSummaryVisible
  }
}
