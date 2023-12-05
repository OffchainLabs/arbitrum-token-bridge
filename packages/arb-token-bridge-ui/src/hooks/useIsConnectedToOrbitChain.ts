import { useChainId } from 'wagmi'
import { isNetwork } from '../util/networks'

export function useIsConnectedToOrbitChain() {
  const chainId = useChainId()
  return isNetwork(chainId).isOrbitChain
}
