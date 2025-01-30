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
  const { isTeleportMode, isDepositMode } = useNetworksRelationship(networks)

  const { data: isOft = false } = useSWR(
    // Only create cache key if we have all required params
    selectedToken && !isTeleportMode
      ? [
          'oft-transfer',
          isDepositMode ? selectedToken.address : selectedToken.l2Address,
          networks.sourceChain.id,
          networks.destinationChain.id
        ]
      : null,
    async () =>
      validateOftTransfer({
        sourceChainId: networks.sourceChain.id,
        destinationChainId: networks.destinationChain.id,
        tokenAddress: isDepositMode
          ? selectedToken?.address
          : selectedToken?.l2Address,
        sourceChainProvider: networks.sourceChainProvider
      }),
    {
      shouldRetryOnError: false,
      revalidateOnFocus: false
    }
  )

  return isOft
}
