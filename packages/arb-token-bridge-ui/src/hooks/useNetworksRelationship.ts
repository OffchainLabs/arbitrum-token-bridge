import { StaticJsonRpcProvider } from '@ethersproject/providers'
import { useMemo } from 'react'
import { Chain } from 'wagmi'
import { UseNetworksState } from './useNetworks'
import { getTransferMode } from '../util/getTransferMode'

type UseNetworksRelationshipState = {
  childChain: Chain
  childChainProvider: StaticJsonRpcProvider
  parentChain: Chain
  parentChainProvider: StaticJsonRpcProvider
  isDepositMode: boolean
  isTeleportMode: boolean
  isWithdrawalMode: boolean
  isDepositOrTeleportMode: boolean
}
export function useNetworksRelationship({
  sourceChain,
  sourceChainProvider,
  destinationChain,
  destinationChainProvider
}: UseNetworksState): UseNetworksRelationshipState {
  return useMemo(() => {
    const transferMode = getTransferMode({
      sourceChainId: sourceChain.id,
      destinationChainId: destinationChain.id
    })

    const isDepositMode = transferMode === 'deposit'
    const isTeleportMode = transferMode === 'teleport'
    const isWithdrawalMode = transferMode === 'withdrawal'

    if (isDepositMode || transferMode === 'teleport') {
      return {
        childChain: destinationChain,
        childChainProvider: destinationChainProvider,
        parentChain: sourceChain,
        parentChainProvider: sourceChainProvider,
        isDepositMode,
        isTeleportMode,
        isWithdrawalMode,
        isDepositOrTeleportMode: true
      }
    }

    return {
      childChain: sourceChain,
      childChainProvider: sourceChainProvider,
      parentChain: destinationChain,
      parentChainProvider: destinationChainProvider,
      isDepositMode: false,
      isTeleportMode: false,
      isWithdrawalMode,
      isDepositOrTeleportMode: false
    }
  }, [
    sourceChain,
    destinationChain,
    destinationChainProvider,
    sourceChainProvider
  ])
}
