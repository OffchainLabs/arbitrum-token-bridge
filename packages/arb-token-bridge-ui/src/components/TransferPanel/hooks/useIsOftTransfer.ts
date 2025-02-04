import useSWR from 'swr'
import { useNetworks } from '../../../hooks/useNetworks'
import { useNetworksRelationship } from '../../../hooks/useNetworksRelationship'
import { getOftTransferConfig } from '../../../token-bridge-sdk/oftUtils'
import { useSelectedToken } from '../../../hooks/useSelectedToken'

export const useIsOftTransfer = function () {
  const [selectedToken] = useSelectedToken()
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
      getOftTransferConfig({
        sourceChainId: networks.sourceChain.id,
        destinationChainId: networks.destinationChain.id,
        sourceChainErc20Address: isDepositMode
          ? selectedToken?.address
          : selectedToken?.l2Address
      }).isValid,
    {
      shouldRetryOnError: false,
      revalidateOnFocus: false
    }
  )

  return isOft
}
