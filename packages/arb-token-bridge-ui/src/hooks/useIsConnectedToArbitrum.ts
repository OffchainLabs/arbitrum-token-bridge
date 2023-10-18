import { useNetwork, useAccount } from 'wagmi'

import { isNetwork } from '../util/networks'

export function useIsConnectedToArbitrum() {
  const { chain } = useNetwork()
  const { isConnected } = useAccount()

  if (typeof chain === 'undefined') {
    if (isConnected) {
      // chain is still loading
      return undefined
    }

    // If user is not connected, assume he's connected to L1
    return false
  }

  return isNetwork(chain.id).isArbitrum
}
