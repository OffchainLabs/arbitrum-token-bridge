import { useNetworks } from '../../../hooks/useNetworks'
import { useNetworksRelationship } from '../../../hooks/useNetworksRelationship'
import { useAppState } from '../../../state'
import { useMemo } from 'react'
import {
  isLayerZeroToken,
  lzProtocolConfig
} from '../../../token-bridge-sdk/oftUtils'

export const useIsOftTransfer = function () {
  const {
    app: { selectedToken }
  } = useAppState()
  const [networks] = useNetworks()
  const { isTeleportMode } = useNetworksRelationship(networks)

  return useMemo(async () => {
    try {
      // Only allow OFT transfers if:
      // 1. OFT compatible source and destination chains are selected
      // 2. We have a valid token selected, and that token is a OFT compatible
      // 3. We're in deposit or withdrawal mode (not teleport)

      // Check if both source and destination chains are supported by LayerZero
      const sourceChainId = networks.sourceChain.id
      const destinationChainId = networks.destinationChain.id

      const isSourceChainSupported = sourceChainId in lzProtocolConfig
      const isDestinationChainSupported = destinationChainId in lzProtocolConfig

      if (!isSourceChainSupported || !isDestinationChainSupported) {
        return false
      }

      // Check if the token is an OFT
      if (!selectedToken) {
        return false
      }
      const isOft = await isLayerZeroToken(
        selectedToken.address,
        networks.sourceChainProvider
      )

      return isOft && !isTeleportMode
    } catch (error) {
      console.warn('Error checking if token is OFT:', error)
      return false
    }
  }, [
    selectedToken,
    networks.sourceChain.id,
    networks.destinationChain.id,
    networks.sourceChainProvider,
    isTeleportMode
  ])
}
