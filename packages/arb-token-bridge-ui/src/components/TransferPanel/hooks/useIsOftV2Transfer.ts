import useSWRImmutable from 'swr/immutable'
import { useNetworks } from '../../../hooks/useNetworks'
import { useNetworksRelationship } from '../../../hooks/useNetworksRelationship'
import { getOftV2TransferConfig } from '../../../token-bridge-sdk/oftUtils'
import { useSelectedToken } from '../../../hooks/useSelectedToken'

export const useIsOftV2Transfer = function () {
  const [selectedToken] = useSelectedToken()
  const [networks] = useNetworks()
  const { isTeleportMode, isDepositMode } = useNetworksRelationship(networks)

  const { data: isOft = false } = useSWRImmutable(
    // Only create cache key if we have all required params
    selectedToken && !isTeleportMode
      ? [
          isDepositMode ? selectedToken.address : selectedToken.l2Address,
          networks.sourceChain.id,
          networks.destinationChain.id,
          'oft-transfer'
        ]
      : null,
    async ([_sourceChainErc20Address, _sourceChainId, _destinationChainId]) =>
      getOftV2TransferConfig({
        sourceChainId: _sourceChainId,
        destinationChainId: _destinationChainId,
        sourceChainErc20Address: _sourceChainErc20Address
      }).isValid
  )

  return isOft
}
