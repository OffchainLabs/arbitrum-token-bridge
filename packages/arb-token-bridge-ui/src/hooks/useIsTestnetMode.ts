import { useCallback, useMemo } from 'react'
import { useNetworks } from './useNetworks'
import { ChainId, isNetwork } from '../util/networks'

export const useIsTestnetMode = () => {
  const [networks, setNetworks] = useNetworks()

  const isTestnetMode = isNetwork(networks.sourceChain.id).isTestnet

  const toggleTestnetMode = useCallback(() => {
    setNetworks({
      sourceChainId: isTestnetMode ? ChainId.Ethereum : ChainId.Sepolia
    })
  }, [isTestnetMode, setNetworks])

  return useMemo(
    () => [isTestnetMode, toggleTestnetMode] as const,
    [isTestnetMode, toggleTestnetMode]
  )
}
