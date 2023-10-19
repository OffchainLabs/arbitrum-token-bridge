import { StaticJsonRpcProvider } from '@ethersproject/providers'
import { useMemo } from 'react'
import { Chain } from 'wagmi'
import { isNetwork } from '../util/networks'
import { UseNetworksState } from './useNetworks'

type ReturnType = {
  parentChain: Chain
  parentProvider: StaticJsonRpcProvider
  childProvider: StaticJsonRpcProvider
  childChain: Chain
}
export function useNetworksRelationship({
  fromProvider,
  from,
  toProvider,
  to
}: UseNetworksState): ReturnType {
  const fromNetwork = fromProvider.network
  const toNetwork = toProvider.network
  const {
    isEthereum: isFromNetworkEthereum,
    isArbitrum: isFromNetworkArbitrum
  } = isNetwork(fromNetwork.chainId)
  const { isOrbitChain: isToNetworkOrbitChain } = isNetwork(toNetwork.chainId)
  const isFromNetworkParent =
    isFromNetworkEthereum || (isFromNetworkArbitrum && isToNetworkOrbitChain)

  return useMemo(() => {
    if (isFromNetworkParent) {
      return {
        parentChain: from,
        parentProvider: fromProvider,
        childProvider: toProvider,
        childChain: to
      }
    }

    return {
      parentChain: to,
      parentProvider: toProvider,
      childProvider: fromProvider,
      childChain: from
    }
  }, [fromProvider, from, toProvider, to, isFromNetworkParent])
}
