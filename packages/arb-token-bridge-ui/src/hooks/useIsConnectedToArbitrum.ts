import { isNetwork } from '../util/networks'
import { useNetworks } from './useNetworks'

// TODO: do we need this hook?
export function useIsConnectedToArbitrum() {
  const [{ sourceChain }] = useNetworks()
  return isNetwork(sourceChain.id).isArbitrum
}
