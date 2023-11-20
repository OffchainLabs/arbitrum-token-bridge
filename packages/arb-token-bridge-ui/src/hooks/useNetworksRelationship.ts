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
  destinationChain,
  destinationChainProvider,
  sourceChain,
  sourceChainProvider
}: UseNetworksState): UseNetworksRelationshipState {
  const sourceNetwork = sourceChainProvider.network
  const destinationNetwork = destinationChainProvider.network
  const {
    isEthereumMainnet: isSourceNetworkEthereum,
    isArbitrum: isSourceNetworkArbitrum
  } = isNetwork(sourceNetwork.chainId)
  const { isOrbitChain: isDestinationNetworkOrbitChain } = isNetwork(
    destinationNetwork.chainId
  )
  const isSourceNetworkParent =
    isSourceNetworkEthereum ||
    (isSourceNetworkArbitrum && isDestinationNetworkOrbitChain)

  return useMemo(() => {
    if (isSourceNetworkParent) {
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
    isSourceNetworkParent,
    sourceChain,
    destinationChain,
    destinationChainProvider,
    sourceChainProvider
  ])
}
