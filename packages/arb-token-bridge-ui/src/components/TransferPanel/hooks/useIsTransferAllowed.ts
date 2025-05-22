import { useMemo } from 'react'
import { useAccount } from 'wagmi'

import { useAppState } from '../../../state'
import { useNetworks } from '../../../hooks/useNetworks'
import { useDestinationAddressError } from './useDestinationAddressError'
import { useArbTokenBridge } from '../../../hooks/useArbTokenBridge'

export function useIsTransferAllowed() {
  const {
    app: { arbTokenBridgeLoaded }
  } = useAppState()

  const arbTokenBridge = useArbTokenBridge()
  const { eth } = arbTokenBridge
  // do not use `useChainId` because it won't detect chains outside of our wagmi config
  const { address: walletAddress, isConnected, chain } = useAccount()
  const [networks] = useNetworks()
  const { destinationAddressError } = useDestinationAddressError()

  return useMemo(() => {
    const isConnectedToTheWrongChain = chain?.id !== networks.sourceChain.id

    if (!arbTokenBridgeLoaded) {
      return false
    }
    if (!eth) {
      return false
    }
    if (!isConnected) {
      return false
    }
    if (!walletAddress) {
      return false
    }
    if (isConnectedToTheWrongChain) {
      return false
    }
    if (!!destinationAddressError) {
      return false
    }
    return true
  }, [
    arbTokenBridgeLoaded,
    chain?.id,
    destinationAddressError,
    isConnected,
    eth,
    networks.sourceChain.id,
    walletAddress
  ])
}
