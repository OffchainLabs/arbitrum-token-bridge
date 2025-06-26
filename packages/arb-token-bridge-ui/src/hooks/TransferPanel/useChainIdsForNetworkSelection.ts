import {
  getDestinationChainIds,
  getSupportedChainIds,
  isNetwork
} from '../../util/networks'
import { ChainId } from '../../types/ChainId'
import { useIsTestnetMode } from '../useIsTestnetMode'
import { useNetworks } from '../useNetworks'
import { useAllowTransfersToNonArbitrumChains } from '../useAllowTransfersToNonArbitrumChains'
import { useMemo } from 'react'

export function useChainIdsForNetworkSelection({
  isSource
}: {
  isSource: boolean
}) {
  const [networks] = useNetworks()
  const [isTestnetMode] = useIsTestnetMode()
  const allowTransfersToNonArbitrumChains =
    useAllowTransfersToNonArbitrumChains()

  return useMemo(() => {
    if (isSource) {
      return getSupportedChainIds({
        includeMainnets: !isTestnetMode,
        includeTestnets: isTestnetMode
      })
    }

    const destinationChainIds = getDestinationChainIds(
      networks.sourceChain.id,
      allowTransfersToNonArbitrumChains
    )

    // if source chain is Arbitrum One, add Arbitrum Nova to destination
    if (networks.sourceChain.id === ChainId.ArbitrumOne) {
      destinationChainIds.push(ChainId.ArbitrumNova)
    }

    if (networks.sourceChain.id === ChainId.ArbitrumNova) {
      destinationChainIds.push(ChainId.ArbitrumOne)
    }

    if (!allowTransfersToNonArbitrumChains) {
      return destinationChainIds.filter(
        chainId => !isNetwork(chainId).isNonArbitrumNetwork
      )
    }

    return destinationChainIds
  }, [
    isSource,
    isTestnetMode,
    networks.sourceChain.id,
    allowTransfersToNonArbitrumChains
  ])
}
