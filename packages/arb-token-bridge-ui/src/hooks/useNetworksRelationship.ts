import { StaticJsonRpcProvider } from '@ethersproject/providers'
import { useMemo } from 'react'
import { Chain } from 'wagmi'
import { UseNetworksState } from './useNetworks'
import { isDepositMode } from '../util/isDepositMode'
import { isTeleport } from '../token-bridge-sdk/teleport'

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

    const _isTeleportMode = isTeleport({
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
        isTeleportMode: _isTeleportMode
      }
    }

    return {
      childChain: sourceChain,
      childChainProvider: sourceChainProvider,
      parentChain: destinationChain,
      parentChainProvider: destinationChainProvider,
      isDepositMode: _isDepositMode,
      isTeleportMode: _isTeleportMode
    }
  }, [
    sourceChain,
    destinationChain,
    destinationChainProvider,
    sourceChainProvider
  ])
}
