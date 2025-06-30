import useSWRImmutable from 'swr/immutable'
import { useNetworks } from '../../../hooks/useNetworks'
import { useNetworksRelationship } from '../../../hooks/useNetworksRelationship'
import { getOftV2TransferConfig } from '../../../token-bridge-sdk/oftUtils'
import { useSelectedToken } from '../../../hooks/useSelectedToken'
import { getDestinationChainIds } from '../../../util/networks'
import { constants } from 'ethers'

export const useIsArbitrumCanonicalTransfer = function () {
  const [selectedToken] = useSelectedToken()
  const [networks] = useNetworks()
  const { isTeleportMode, isDepositMode } = useNetworksRelationship(networks)

  const isValidPair = getDestinationChainIds(networks.sourceChain.id).includes(
    networks.destinationChain.id
  )

  if (!isValidPair) return false

  // Teleport only support ETH
  if (isTeleportMode && selectedToken?.address === constants.AddressZero) {
    return false
  }
}
