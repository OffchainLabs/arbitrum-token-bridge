import { useMemo } from 'react'
import { Chain } from 'wagmi'

import { isNetwork } from '../../util/networks'
import { GasEstimationStatus } from '../../components/TransferPanel/TransferPanelSummary'

export function useStyles({
  l1Network,
  l2Network,
  isSwitchingL2Chain,
  isTransferring,
  isDepositMode,
  disableDeposit,
  disableWithdrawal,
  gasEstimationStatus
}: {
  l1Network: Chain
  l2Network: Chain
  isSwitchingL2Chain: boolean
  isTransferring: boolean
  isDepositMode: boolean
  disableDeposit: boolean
  disableWithdrawal: boolean
  gasEstimationStatus: GasEstimationStatus
}) {
  const depositButtonColorClassName = useMemo(() => {
    const { isArbitrum, isArbitrumNova, isXaiTestnet, isStylusTestnet } =
      isNetwork(l2Network.id)

    if (isArbitrumNova) {
      return 'bg-arb-nova-dark'
    }

    if (isArbitrum) {
      return 'bg-arb-one-dark'
    }

    if (isXaiTestnet) {
      return 'bg-xai-dark'
    }

    if (isStylusTestnet) {
      return 'bg-stylus-dark'
    }

    // is Orbit chain
    return 'bg-orbit-dark'
  }, [l2Network.id])

  const withdrawalButtonColorClassName = useMemo(() => {
    const { isArbitrumNova: isParentChainArbitrumNova } = isNetwork(
      l1Network.id
    )
    const { isArbitrum } = isNetwork(l2Network.id)

    if (isArbitrum) {
      return 'bg-eth-dark'
    }

    // is Orbit chain
    if (isParentChainArbitrumNova) {
      return 'bg-arb-nova-dark'
    }

    return 'bg-arb-one-dark'
  }, [l1Network.id, l2Network.id])

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

  return {
    depositButtonColorClassName,
    withdrawalButtonColorClassName,
    isSummaryVisible
  }
}
