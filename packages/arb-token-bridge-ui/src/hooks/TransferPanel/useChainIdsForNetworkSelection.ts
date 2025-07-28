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
import { isLifiEnabled } from '../../util/featureFlag'

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
      const sourceChainIds = getSupportedChainIds({
        includeMainnets: !isTestnetMode,
        includeTestnets: isTestnetMode
      })

      // do not display chains that have no destination chains
      return sourceChainIds.filter(
        chainId =>
          getDestinationChainIds(chainId, {
            disableTransfersToNonArbitrumChains
          }).length > 0
      )
    }

    const destinationChainIds = getDestinationChainIds(
      networks.sourceChain.id,
      {
        includeLifiEnabledChainPairs: isLifiEnabled(),
        disableTransfersToNonArbitrumChains
      }
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
