import { useAppState } from '../../state'
import { isExperimentalFeatureEnabled } from '../../util'
import { useNetworks } from '../useNetworks'
import { useNetworksRelationship } from '../useNetworksRelationship'

export const useIsBatchTransferSupported = () => {
  const [networks] = useNetworks()
  const { isDepositMode, isTeleportMode } = useNetworksRelationship(networks)
  const {
    app: { selectedToken }
  } = useAppState()

  if (!isExperimentalFeatureEnabled('batch')) {
    return false
  }
  if (!selectedToken) {
    return false
  }
  if (!isDepositMode) {
    return false
  }
  // TODO: teleport is disabled for now but it needs to be looked into more to check whether it is or can be supported
  if (isTeleportMode) {
    return false
  }

  return true
}
