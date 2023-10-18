import { useMemo } from 'react'
import { BigNumber, utils } from 'ethers'

import { useAppState } from '../../state'
import { useArbQueryParams } from '../../hooks/useArbQueryParams'
import { useIsConnectedToArbitrum } from '../../hooks/useIsConnectedToArbitrum'
import { useNetworks } from '../../hooks/useNetworks'

export function calculateEstimatedL1GasFees(
  estimatedL1Gas: BigNumber,
  l1GasPrice: BigNumber
) {
  return parseFloat(utils.formatEther(estimatedL1Gas.mul(l1GasPrice)))
}

export function calculateEstimatedL2GasFees(
  estimatedL2Gas: BigNumber,
  l2GasPrice: BigNumber,
  estimatedL2SubmissionCost: BigNumber
) {
  return parseFloat(
    utils.formatEther(
      estimatedL2Gas.mul(l2GasPrice).add(estimatedL2SubmissionCost)
    )
  )
}

// TODO: These could be useful in the rest of the app
export function useIsSwitchingL2Chain() {
  return false
  // const { app } = useAppState()
  // const { isDepositMode } = app

  // const [{ fromProvider, toProvider }] = useNetworks()
  // const isConnectedToArbitrum = useIsConnectedToArbitrum()
  // // TODO: replace with chain from useNetworks
  // const [{ l2ChainId: l2ChainIdSearchParam }] = useArbQueryParams()

  // return useMemo(() => {
  //   if (isConnectedToArbitrum || !isDepositMode) {
  //     return false
  //   }

  //   // if l2ChainId url param is either null, undefined, blank, 0 or invalid number
  //   if (!l2ChainIdSearchParam || isNaN(l2ChainIdSearchParam)) {
  //     return false
  //   }

  //   return l2.network.id !== l2ChainIdSearchParam
  // }, [isConnectedToArbitrum, isDepositMode, l2, l2ChainIdSearchParam])
}
