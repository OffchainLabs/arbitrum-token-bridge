import { useCallback } from 'react'
import { useNetworks } from './useNetworks'
import { ChainId, isNetwork } from '../util/networks'
import { useSelectedToken } from './useSelectedToken'

export const useIsTestnetMode = () => {
  const [networks, setNetworks] = useNetworks()
  const { setSelectedToken } = useSelectedToken()

  const isTestnetMode = isNetwork(networks.sourceChain.id).isTestnet

  const toggleTestnetMode = useCallback(() => {
    setNetworks({
      sourceChainId: isTestnetMode ? ChainId.Ethereum : ChainId.Sepolia
    })
    setSelectedToken(null)
  }, [isTestnetMode, setNetworks, setSelectedToken])

  return [isTestnetMode, toggleTestnetMode] as const
}
