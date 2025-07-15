import {
  getDestinationChainIds,
  getSupportedChainIds,
  isNetwork
} from '../../util/networks'
import { ChainId } from '../../types/ChainId'
import { useIsTestnetMode } from '../useIsTestnetMode'
import { useNetworks } from '../useNetworks'
import { useMemo } from 'react'
import { useDisabledFeatures } from '../useDisabledFeatures'
import { DisabledFeatures } from '../useArbQueryParams'

export function useChainIdsForNetworkSelection({
  isSource
}: {
  isSource: boolean
}) {
  const [networks] = useNetworks()
  const [isTestnetMode] = useIsTestnetMode()

  const { isFeatureDisabled } = useDisabledFeatures()

  const disableTransfersToNonArbitrumChains = isFeatureDisabled(
    DisabledFeatures.TRANSFERS_TO_NON_ARBITRUM_CHAINS
  )

  return useMemo(() => {
    if (isSource) {
      return getSupportedChainIds({
        includeMainnets: !isTestnetMode,
        includeTestnets: isTestnetMode
      })
    }

    const destinationChainIds = getDestinationChainIds(
      networks.sourceChain.id,
      disableTransfersToNonArbitrumChains
    )

    // if source chain is Arbitrum One, add Arbitrum Nova to destination
    if (networks.sourceChain.id === ChainId.ArbitrumOne) {
      destinationChainIds.push(ChainId.ArbitrumNova)
    }

    if (networks.sourceChain.id === ChainId.ArbitrumNova) {
      destinationChainIds.push(ChainId.ArbitrumOne)
    }

    if (disableTransfersToNonArbitrumChains) {
      return destinationChainIds.filter(
        chainId => !isNetwork(chainId).isNonArbitrumNetwork
      )
    }

    return destinationChainIds
  }, [
    isSource,
    isTestnetMode,
    networks.sourceChain.id,
    disableTransfersToNonArbitrumChains
  ])
}
