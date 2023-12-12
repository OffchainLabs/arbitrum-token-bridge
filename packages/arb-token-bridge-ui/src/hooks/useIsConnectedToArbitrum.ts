import { useNetwork } from 'wagmi'
import { isNetwork } from '../util/networks'

export function useIsConnectedToArbitrum() {
  const { chain } = useNetwork()
  return isNetwork(chain?.id ?? 0).isArbitrum
}
