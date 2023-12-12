import { useNetwork } from 'wagmi'
import { isNetwork } from '../util/networks'

export function useIsConnectedToOrbitChain() {
  const { chain } = useNetwork()
  return isNetwork(chain?.id ?? 0).isOrbitChain
}
