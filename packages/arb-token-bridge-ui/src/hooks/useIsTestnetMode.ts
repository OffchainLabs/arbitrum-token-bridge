import { useCallback } from 'react'

import { ChainId } from '../types/ChainId'
import { isNetwork } from '../util/networks'
import { useNetworks } from './useNetworks'

export const useIsTestnetMode = () => {
  const [networks, setNetworks] = useNetworks()

  const isTestnetMode = isNetwork(networks.sourceChain.id).isTestnet

  const toggleTestnetMode = useCallback(() => {
    setNetworks({
      sourceChainId: isTestnetMode ? ChainId.Ethereum : ChainId.Sepolia
    })
  }, [isTestnetMode, setNetworks])

  return [isTestnetMode, toggleTestnetMode] as const
}
