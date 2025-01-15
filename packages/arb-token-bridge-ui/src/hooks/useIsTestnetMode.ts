import { useCallback } from 'react'
import { useNetworks } from './useNetworks'
import { useSelectedToken } from './useSelectedToken'
import { isNetwork } from '../util/networks'
import { ChainId } from '../types/ChainId'

export const useIsTestnetMode = () => {
  const [networks, setNetworks] = useNetworks()
  const [, setSelectedToken] = useSelectedToken()

  const isTestnetMode = isNetwork(networks.sourceChain.id).isTestnet

  const toggleTestnetMode = useCallback(() => {
    setNetworks({
      sourceChainId: isTestnetMode ? ChainId.Ethereum : ChainId.Sepolia
    })
    setSelectedToken(null)
  }, [isTestnetMode, setNetworks, setSelectedToken])

  return [isTestnetMode, toggleTestnetMode] as const
}
