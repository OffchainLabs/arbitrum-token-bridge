import { useMemo } from 'react'

import { useAppState } from '../../state'
import { useIsSwitchingL2Chain } from '../../components/TransferPanel/TransferPanelMainUtils'
import { useAppContextState } from '../../components/App/AppContext'
import { GasEstimationStatus } from '../../components/TransferPanel/TransferPanelSummary'
import { UseTransferReadinessTransferReady } from '../../components/TransferPanel/useTransferReadiness'

export function useSummaryVisibility({
  transferReady: { deposit: depositReady, withdrawal: withdrawalReady },
  gasEstimationStatus
}: {
  transferReady: UseTransferReadinessTransferReady
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

    return isDepositMode ? depositReady : withdrawalReady
  }, [
    isSwitchingL2Chain,
    gasEstimationStatus,
    isTransferring,
    isDepositMode,
    depositReady,
    withdrawalReady
  ])

  return {
    isSummaryVisible
  }
}
