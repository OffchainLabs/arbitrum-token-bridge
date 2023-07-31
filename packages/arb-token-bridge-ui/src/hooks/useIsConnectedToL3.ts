import { useNetwork } from 'wagmi'

import { isNetwork } from '../util/networks'

export function useIsConnectedToL3() {
  const { chain } = useNetwork()

  if (typeof chain === 'undefined') {
    return undefined
  }

  return isNetwork(chain.id).isL3
}
