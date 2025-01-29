import { useNetworks } from '../../../hooks/useNetworks'
import { useNetworksRelationship } from '../../../hooks/useNetworksRelationship'
import { useAppState } from '../../../state'
import useSWR from 'swr'
import { validateOftTransfer } from '../../../token-bridge-sdk/oftUtils'

export const useIsOftTransfer = function () {
  const {
    app: { selectedToken }
  } = useAppState()
  const [networks] = useNetworks()
  const { isTeleportMode } = useNetworksRelationship(networks)

  const { data: isOft = false } = useSWR(
    // Only create cache key if we have all required params
    selectedToken && !isTeleportMode
      ? [
          'validate-oft-transfer',
          selectedToken.address,
          networks.sourceChain.id,
          networks.destinationChain.id
        ]
      : null,
    async () =>
      validateOftTransfer({
        sourceChainId: networks.sourceChain.id,
        destinationChainId: networks.destinationChain.id,
        tokenAddress: selectedToken?.address,
        sourceChainProvider: networks.sourceChainProvider
      }),
    {
      shouldRetryOnError: false,
      revalidateOnFocus: false
    }
  )

  return isOft
}
