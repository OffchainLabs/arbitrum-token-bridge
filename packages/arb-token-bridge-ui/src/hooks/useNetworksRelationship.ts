import { StaticJsonRpcProvider } from '@ethersproject/providers'
import { useMemo } from 'react'
import { Chain } from 'wagmi'
import { isNetwork } from '../util/networks'
import { UseNetworksState } from './useNetworks'

type UseNetworksRelationshipState = {
  childChain: Chain
  childChainProvider: StaticJsonRpcProvider
  parentChain: Chain
  parentChainProvider: StaticJsonRpcProvider
  isDepositMode: boolean
}
export function useNetworksRelationship({
  sourceChain,
  sourceChainProvider,
  destinationChain,
  destinationChainProvider
}: UseNetworksState): UseNetworksRelationshipState {
  return useMemo(() => {
    const {
      isEthereumMainnetOrTestnet: isSourceChainEthereum,
      isArbitrum: isSourceChainArbitrum
    } = isNetwork(sourceChain.id)
    const { isOrbitChain: isDestinationChainOrbit } = isNetwork(
      destinationChain.id
    )
    const isDepositMode =
      isSourceChainEthereum ||
      (isSourceChainArbitrum && isDestinationChainOrbit)

    if (isDepositMode) {
      return {
        childChain: destinationChain,
        childChainProvider: destinationChainProvider,
        parentChain: sourceChain,
        parentChainProvider: sourceChainProvider,
        isDepositMode
      }
    }

    return {
      childChain: sourceChain,
      childChainProvider: sourceChainProvider,
      parentChain: destinationChain,
      parentChainProvider: destinationChainProvider,
      isDepositMode
    }
  }, [
    sourceChain,
    destinationChain,
    destinationChainProvider,
    sourceChainProvider
  ])
}
