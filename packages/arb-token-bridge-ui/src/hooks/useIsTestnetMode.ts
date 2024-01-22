import { useLocalStorage } from '@uidotdev/usehooks'
import { useEffect } from 'react'
import { isNetwork } from '../util/networks'
import { useNetworks } from './useNetworks'

const testnetModeLocalStorageKey = 'arbitrum:bridge:settings:testnetMode'

export const useIsTestnetMode = () => {
  const [{ sourceChain }] = useNetworks()
  const [isTestnetMode, setIsTestnetMode] = useLocalStorage<boolean>(
    testnetModeLocalStorageKey,
    false
  )
  const isSourceChainTestnet = isNetwork(sourceChain.id).isTestnet

  useEffect(() => {
    // force test mode if source chain is testnet
    if (isSourceChainTestnet) {
      setIsTestnetMode(true)
    }
  }, [isSourceChainTestnet, setIsTestnetMode])

  return { isSourceChainTestnet, isTestnetMode, setIsTestnetMode } as const
}
