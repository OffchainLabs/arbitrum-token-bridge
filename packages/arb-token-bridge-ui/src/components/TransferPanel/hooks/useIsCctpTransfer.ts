import { useNetworks } from '../../../hooks/useNetworks'
import { useNetworksRelationship } from '../../../hooks/useNetworksRelationship'
import { getTransferMode } from '../../../util/getTransferMode'
import { useSelectedToken } from '../../../hooks/useSelectedToken'
import { isNetwork } from '../../../util/networks'
import {
  isTokenArbitrumOneNativeUSDC,
  isTokenArbitrumSepoliaNativeUSDC,
  isTokenMainnetUSDC,
  isTokenSepoliaUSDC
} from '../../../util/TokenUtils'

export const useIsCctpTransfer = function () {
  const [selectedToken] = useSelectedToken()
  const [networks] = useNetworks()
  const { childChain } = useNetworksRelationship(networks)
  const transferMode = getTransferMode({
    sourceChainId: networks.sourceChain.id,
    destinationChainId: networks.destinationChain.id
  })
  const { isArbitrumOne, isArbitrumSepolia } = isNetwork(childChain.id)

  if (!selectedToken) {
    return false
  }

  if (transferMode === 'teleport') {
    return false
  }

  if (transferMode === 'deposit') {
    if (isTokenMainnetUSDC(selectedToken.address) && isArbitrumOne) {
      return true
    }

    if (isTokenSepoliaUSDC(selectedToken.address) && isArbitrumSepolia) {
      return true
    }
  } else {
    if (isTokenArbitrumOneNativeUSDC(selectedToken.address) && isArbitrumOne) {
      return true
    }

    if (
      isTokenArbitrumSepoliaNativeUSDC(selectedToken.address) &&
      isArbitrumSepolia
    ) {
      return true
    }
  }

  return false
}
