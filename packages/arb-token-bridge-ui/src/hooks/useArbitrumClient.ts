import { createArbitrumClient, type ArbitrumClients } from '@arbitrum/sdk-viem'
import { useMemo } from 'react'
import { useLatest } from 'react-use'
import { useWalletClient } from 'wagmi'
import { useNetworks } from './useNetworks'
import { useNetworksRelationship } from './useNetworksRelationship'

/**
 * A React hook that creates an Arbitrum client using the current network configuration.
 * @returns An ArbitrumClients object containing parent and child clients
 */
export function useArbitrumClient(): Partial<ArbitrumClients> {
  const [networks] = useNetworks()
  const latestNetworks = useLatest(networks)
  const {
    current: { childChain, parentChain }
  } = useLatest(useNetworksRelationship(latestNetworks.current))

  const { data: parentWalletClient } = useWalletClient({
    chainId: parentChain.id
  })
  const { data: childWalletClient } = useWalletClient({
    chainId: childChain.id
  })

  return useMemo(() => {
    if (!parentWalletClient || !networks || !parentChain || !childChain)
      return {}

    return createArbitrumClient({
      parentChain,
      childChain,
      parentWalletClient,
      childWalletClient
    })
  }, [networks, parentChain, childChain, parentWalletClient, childWalletClient])
}
