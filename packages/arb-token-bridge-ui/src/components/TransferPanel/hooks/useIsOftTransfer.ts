import { useNetworks } from '../../../hooks/useNetworks'
import { useNetworksRelationship } from '../../../hooks/useNetworksRelationship'
import { useAppState } from '../../../state'
import { useMemo } from 'react'
import { getProviderForChainId } from '../../../token-bridge-sdk/utils'
import { isLayerZeroToken } from '../../../token-bridge-sdk/oftUtils'

export const useIsOftTransfer = function () {
  const {
    app: { selectedToken }
  } = useAppState()
  const [networks] = useNetworks()
  const { isDepositMode, isTeleportMode } = useNetworksRelationship(networks)

  return useMemo(async () => {
    if (!selectedToken) {
      return false
    }

    // OFT transfers are not compatible with teleport mode
    if (isTeleportMode) {
      return false
    }

    try {
      const sourceChainProvider = getProviderForChainId(networks.sourceChain.id)
      const isOft = await isLayerZeroToken(
        selectedToken.address,
        networks.sourceChain.id
      )

      // Only allow OFT transfers if:
      // 1. Token is an OFT
      // 2. We're in deposit or withdrawal mode (not teleport)
      // 3. We have a valid token selected
      return isOft && !isTeleportMode && !!selectedToken
    } catch (error) {
      console.warn('Error checking if token is OFT:', error)
      return false
    }
  }, [selectedToken, networks.sourceChain.id, isTeleportMode])
}
