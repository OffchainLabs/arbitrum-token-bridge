import { isNetwork } from '../util/networks'
import { useNetworks } from './useNetworks'

export function useIsConnectedToOrbitChain() {
  const [{ sourceChain }] = useNetworks()
  return isNetwork(sourceChain.id).isOrbitChain
}
