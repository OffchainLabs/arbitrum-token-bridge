import { useAppState } from '../../state'
import { isExperimentalFeatureEnabled } from '../../util'
import { useNativeCurrency } from '../useNativeCurrency'
import { useNetworks } from '../useNetworks'
import { useNetworksRelationship } from '../useNetworksRelationship'

export const useIsBatchTransferSupported = () => {
  const [networks] = useNetworks()
  const { isDepositMode, isTeleportMode, childChainProvider } =
    useNetworksRelationship(networks)
  const {
    app: { selectedToken }
  } = useAppState()
  const nativeCurrency = useNativeCurrency({ provider: childChainProvider })

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
  // TODO: disable custom native currency for now, check if this works
  if (nativeCurrency.isCustom) {
    return false
  }

  return true
}
