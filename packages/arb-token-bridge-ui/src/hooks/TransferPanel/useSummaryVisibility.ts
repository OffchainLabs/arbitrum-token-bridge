import { useMemo } from 'react'

import { useAppState } from '../../state'
import { useIsSwitchingL2Chain } from '../../components/TransferPanel/TransferPanelMainUtils'
import { useAppContextState } from '../../components/App/AppContext'
import { GasEstimationStatus } from '../../components/TransferPanel/TransferPanelSummary'
import { UseTransferReadinessReady } from '../../components/TransferPanel/useTransferReadiness'

export function useSummaryVisibility({
  ready: { deposit: depositReady, withdrawal: withdrawalReady },
  gasEstimationStatus
}: {
  ready: UseTransferReadinessReady
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
