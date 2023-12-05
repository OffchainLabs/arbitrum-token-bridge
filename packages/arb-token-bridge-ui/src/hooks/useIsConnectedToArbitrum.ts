import { useChainId } from 'wagmi'
import { isNetwork } from '../util/networks'

export function useIsConnectedToArbitrum() {
  const chainId = useChainId()
  return isNetwork(chainId).isArbitrum
}
