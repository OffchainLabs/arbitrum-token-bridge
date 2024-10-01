import { useMemo } from 'react'
import { useLatest } from 'react-use'
import { useAccount, useNetwork } from 'wagmi'

import { useAppState } from '../../../state'
import { useNetworks } from '../../../hooks/useNetworks'
import { useDestinationAddressError } from './useDestinationAddressError'

export function useIsTransferAllowed() {
  const {
    app: {
      arbTokenBridgeLoaded,
      arbTokenBridge: { eth }
    }
  } = useAppState()
  const { address: walletAddress, isConnected } = useAccount()
  const latestEth = useLatest(eth)
  // do not use `useChainId` because it won't detect chains outside of our wagmi config
  const { chain } = useNetwork()
  const [networks] = useNetworks()
  const { destinationAddressError } = useDestinationAddressError()

  return useMemo(() => {
    const isConnectedToTheWrongChain = chain?.id !== networks.sourceChain.id

    if (!arbTokenBridgeLoaded) {
      return false
    }
    if (!latestEth.current) {
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
    latestEth,
    networks.sourceChain.id,
    walletAddress
  ])
}
