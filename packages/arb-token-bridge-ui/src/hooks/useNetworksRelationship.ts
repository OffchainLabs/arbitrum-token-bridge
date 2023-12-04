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
    const isSourceChainParent =
      isSourceChainEthereum ||
      (isSourceChainArbitrum && isDestinationChainOrbit)

    if (isSourceChainParent) {
      return {
        childChain: destinationChain,
        childChainProvider: destinationChainProvider,
        parentChain: sourceChain,
        parentChainProvider: sourceChainProvider
      }
    }

    return {
      childChain: sourceChain,
      childChainProvider: sourceChainProvider,
      parentChain: destinationChain,
      parentChainProvider: destinationChainProvider
    }
  }, [
    sourceChain,
    destinationChain,
    destinationChainProvider,
    sourceChainProvider
  ])
}
