import {
  getDestinationChainIds,
  getSupportedChainIds
} from '../../util/networks'
import { ChainId } from '../../types/ChainId'
import { useIsTestnetMode } from '../useIsTestnetMode'
import { useNetworks } from '../useNetworks'
import { useMemo } from 'react'

export function useChainIdsForNetworkSelection({
  isSource
}: {
  isSource: boolean
}) {
  const [networks] = useNetworks()
  const [isTestnetMode] = useIsTestnetMode()

  return useMemo(() => {
    if (isSource) {
      return getSupportedChainIds({
        includeMainnets: !isTestnetMode,
        includeTestnets: isTestnetMode
      })
    }

    const destinationChainIds = getDestinationChainIds(networks.sourceChain.id)

    // if source chain is Arbitrum One, add Arbitrum Nova to destination
    if (networks.sourceChain.id === ChainId.ArbitrumOne) {
      destinationChainIds.push(ChainId.ArbitrumNova)
    }

    if (networks.sourceChain.id === ChainId.ArbitrumNova) {
      destinationChainIds.push(ChainId.ArbitrumOne)
    }

    return destinationChainIds
  }, [isSource, isTestnetMode, networks.sourceChain.id])
}
