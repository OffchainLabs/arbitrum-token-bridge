import { StaticJsonRpcProvider } from '@ethersproject/providers'
import { useMemo } from 'react'
import { Chain } from 'wagmi/chains'

import { isValidTeleportChainPair } from '@/token-bridge-sdk/teleport'

import { isDepositMode } from '../util/isDepositMode'
import { UseNetworksState } from './useNetworks'

type UseNetworksRelationshipState = {
  childChain: Chain
  childChainProvider: StaticJsonRpcProvider
  parentChain: Chain
  parentChainProvider: StaticJsonRpcProvider
  isDepositMode: boolean
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

    if (_isDepositMode) {
      return {
        childChain: destinationChain,
        childChainProvider: destinationChainProvider,
        parentChain: sourceChain,
        parentChainProvider: sourceChainProvider,
        isDepositMode: _isDepositMode,
        isTeleportMode
      }
    }

    return {
      childChain: sourceChain,
      childChainProvider: sourceChainProvider,
      parentChain: destinationChain,
      parentChainProvider: destinationChainProvider,
      isDepositMode: _isDepositMode,
      isTeleportMode
    }
  }, [
    sourceChain,
    destinationChain,
    destinationChainProvider,
    sourceChainProvider
  ])
}
