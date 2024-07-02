import { useAccount } from 'wagmi'

import { isNetwork } from '../util/networks'

export function useIsConnectedToArbitrum() {
  const { chain } = useAccount()

  if (typeof chain === 'undefined') {
    return undefined
  }

  return isNetwork(chain.id).isArbitrum
}
