import { useNetworks } from '../../../hooks/useNetworks'
import { useNetworksRelationship } from '../../../hooks/useNetworksRelationship'
import { useAppState } from '../../../state'
import { isNetwork } from '../../../util/networks'
import {
  isTokenArbitrumOneNativeUSDC,
  isTokenArbitrumSepoliaNativeUSDC,
  isTokenMainnetUSDC,
  isTokenSepoliaUSDC
} from '../../../util/TokenUtils'

export const useIsCctpTransfer = function () {
  const {
    app: { selectedToken }
  } = useAppState()
  const [networks] = useNetworks()
  const { childChain, isDepositMode, isTeleportMode } =
    useNetworksRelationship(networks)
  const { isArbitrumOne, isArbitrumSepolia } = isNetwork(childChain.id)

  if (!selectedToken) {
    return false
  }

  if (isTeleportMode) {
    return false
  }

  if (isDepositMode) {
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
