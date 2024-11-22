import { useMemo } from 'react'
import { useAccount, useNetwork } from 'wagmi'

import { useNetworks } from '../../../hooks/useNetworks'
import { useDestinationAddressError } from './useDestinationAddressError'

export function useIsTransferAllowed() {
  const { address: walletAddress, isConnected } = useAccount()
  // do not use `useChainId` because it won't detect chains outside of our wagmi config
  const { chain } = useNetwork()
  const [networks] = useNetworks()
  const { destinationAddressError } = useDestinationAddressError()

  return useMemo(() => {
    const isConnectedToTheWrongChain = chain?.id !== networks.sourceChain.id

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
    chain?.id,
    destinationAddressError,
    isConnected,
    networks.sourceChain.id,
    walletAddress
  ])
}
