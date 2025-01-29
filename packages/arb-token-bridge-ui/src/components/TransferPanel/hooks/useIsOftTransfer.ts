import { useNetworks } from '../../../hooks/useNetworks'
import { useNetworksRelationship } from '../../../hooks/useNetworksRelationship'
import { useAppState } from '../../../state'
import { useMemo } from 'react'
import { isLayerZeroToken } from '../../../token-bridge-sdk/oftUtils'

export const useIsOftTransfer = function () {
  const {
    app: { selectedToken }
  } = useAppState()
  const [networks] = useNetworks()
  const { isTeleportMode } = useNetworksRelationship(networks)

  return useMemo(async () => {
    if (!selectedToken) {
      return false
    }

    try {
      // Only allow OFT transfers if:
      // 1. We have a valid token selected
      // 2. Token is an OFT
      // 3. We're in deposit or withdrawal mode (not teleport)

      const isOft = await isLayerZeroToken(
        selectedToken.address,
        networks.sourceChain.id
      )

      return isOft && !isTeleportMode && !!selectedToken
    } catch (error) {
      console.warn('Error checking if token is OFT:', error)
      return false
    }
  }, [selectedToken, networks.sourceChain.id, isTeleportMode])
}
