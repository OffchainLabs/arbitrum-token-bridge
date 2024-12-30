import { StaticJsonRpcProvider } from '@ethersproject/providers'
import { useMemo } from 'react'
import { Chain } from 'wagmi'
import { UseNetworksState } from './useNetworks'
import { isDepositMode } from '../util/isDepositMode'
import { isValidTeleportChainPair } from '@/token-bridge-sdk/teleport'

type UseNetworksRelationshipState = {
  childChain: Chain
  childChainProvider: StaticJsonRpcProvider
  parentChain: Chain
  parentChainProvider: StaticJsonRpcProvider
  isDepositMode: boolean
  isWithdrawalMode: boolean
  isTeleportMode: boolean
}
export function useNetworksRelationship({
  sourceChain,
  sourceChainProvider,
  destinationChain,
  destinationChainProvider
}: UseNetworksState): UseNetworksRelationshipState {
  return useMemo(() => {
    const _isDepositMode = isDepositMode({
      sourceChainId: sourceChain.id,
      destinationChainId: destinationChain.id
    })

    const isTeleportMode = isValidTeleportChainPair({
      sourceChainId: sourceChain.id,
      destinationChainId: destinationChain.id
    })

    const isWithdrawalMode = !(_isDepositMode || isTeleportMode)

    if (_isDepositMode || isTeleportMode) {
      return {
        childChain: destinationChain,
        childChainProvider: destinationChainProvider,
        parentChain: sourceChain,
        parentChainProvider: sourceChainProvider,
        isDepositMode: _isDepositMode,
        isWithdrawalMode,
        isTeleportMode
      }
    }

    return {
      childChain: sourceChain,
      childChainProvider: sourceChainProvider,
      parentChain: destinationChain,
      parentChainProvider: destinationChainProvider,
      isDepositMode: _isDepositMode,
      isWithdrawalMode,
      isTeleportMode
    }
  }, [
    sourceChain,
    destinationChain,
    destinationChainProvider,
    sourceChainProvider
  ])
}
