import { useMemo } from 'react'

import { useAppContextState } from '../../components/App/AppContext'
import { GasEstimationStatus } from '../../components/TransferPanel/TransferPanelSummary'
import { UseTransferReadinessTransferReady } from '../../components/TransferPanel/useTransferReadiness'
import { useNetworks } from '../useNetworks'
import { useNetworksRelationship } from '../useNetworksRelationship'

export function useSummaryVisibility({
  transferReady: { deposit: depositReady, withdrawal: withdrawalReady },
  gasEstimationStatus
}: {
  transferReady: UseTransferReadinessTransferReady
  gasEstimationStatus: GasEstimationStatus
}) {
  const {
    layout: { isTransferring }
  } = useAppContextState()
  const [networks] = useNetworks()
  const { isDepositMode } = useNetworksRelationship(networks)

  const isSummaryVisible = useMemo(() => {
    if (gasEstimationStatus === 'error') {
      return false
    }

    if (isTransferring) {
      return true
    }

    return isDepositMode ? depositReady : withdrawalReady
  }, [
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
