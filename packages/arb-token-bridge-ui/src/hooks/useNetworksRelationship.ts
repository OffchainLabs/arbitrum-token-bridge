import { StaticJsonRpcProvider } from '@ethersproject/providers'
import { useMemo } from 'react'
import { Chain } from 'wagmi/chains'

import { UseNetworksState } from './useNetworks'
import { isDepositMode } from '../util/isDepositMode'
import { isValidTeleportChainPair } from '@/token-bridge-sdk/teleport'
import { isLifiTransfer } from '../app/api/crosschain-transfers/utils'
import { ChainId } from '../types/ChainId'

type UseNetworksRelationshipState = {
  childChain: Chain
  childChainProvider: StaticJsonRpcProvider
  parentChain: Chain
  parentChainProvider: StaticJsonRpcProvider
  isDepositMode: boolean
  isTeleportMode: boolean
  /** true if route is supported through lifi (regardless of selected token)  */
  isLifi: boolean
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

    const isLifi = isLifiTransfer({
      sourceChainId: sourceChain.id,
      destinationChainId: destinationChain.id
    })

    // Ape to Superposition, set Superposition as parent chain
    if (
      sourceChain.id === ChainId.ApeChain &&
      destinationChain.id === ChainId.Superposition
    ) {
      return {
        childChain: sourceChain,
        childChainProvider: sourceChainProvider,
        parentChain: destinationChain,
        parentChainProvider: destinationChainProvider,
        isDepositMode: false,
        isTeleportMode: false,
        isLifi
      }
    }

    // Superposition to Ape, set Superposition as parent chain
    if (
      sourceChain.id === ChainId.Superposition &&
      destinationChain.id === ChainId.ApeChain
    ) {
      return {
        childChain: destinationChain,
        childChainProvider: destinationChainProvider,
        parentChain: sourceChain,
        parentChainProvider: sourceChainProvider,
        isDepositMode: true,
        isTeleportMode: false,
        isLifi
      }
    }

    if (_isDepositMode) {
      return {
        childChain: destinationChain,
        childChainProvider: destinationChainProvider,
        parentChain: sourceChain,
        parentChainProvider: sourceChainProvider,
        isDepositMode: _isDepositMode,
        isTeleportMode,
        isLifi
      }
    }

    return {
      childChain: sourceChain,
      childChainProvider: sourceChainProvider,
      parentChain: destinationChain,
      parentChainProvider: destinationChainProvider,
      isDepositMode: _isDepositMode,
      isTeleportMode,
      isLifi
    }
  }, [
    sourceChain,
    destinationChain,
    destinationChainProvider,
    sourceChainProvider
  ])
}
