import { useAppState } from '../../state'
import { isTokenNativeUSDC } from '../../util/TokenUtils'
import { useNetworks } from '../useNetworks'
import { useNetworksRelationship } from '../useNetworksRelationship'
import { useSelectedToken } from '../useSelectedToken'
import { useIsOftV2Transfer } from '../../components/TransferPanel/hooks/useIsOftV2Transfer'

export const useIsBatchTransferSupported = () => {
  const [networks] = useNetworks()
  const { isDepositMode, isTeleportMode } = useNetworksRelationship(networks)
  const [selectedToken] = useSelectedToken()
  const isOftTransfer = useIsOftV2Transfer()

  if (!selectedToken) {
    return false
  }
  if (!isDepositMode) {
    return false
  }
  if (isTokenNativeUSDC(selectedToken.address)) {
    return false
  }
  // TODO: teleport is disabled for now but it needs to be looked into more to check whether it is or can be supported
  if (isTeleportMode) {
    return false
  }

  if (isOftTransfer) {
    return false
  }

  return true
}
