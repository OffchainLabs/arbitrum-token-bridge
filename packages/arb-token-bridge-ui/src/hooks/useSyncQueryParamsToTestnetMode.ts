import { isNetwork } from '../util/networks'
import { useIsTestnetMode } from './useIsTestnetMode'
import { useNetworks } from './useNetworks'
import { useEffect } from 'react'

export const useSyncQueryParamsToTestnetMode = () => {
  const [{ sourceChain }] = useNetworks()
  const { setIsTestnetMode } = useIsTestnetMode()

  const isSourceChainTestnet = isNetwork(sourceChain.id).isTestnet

  useEffect(() => {
    // force test mode if source chain is testnet
    if (isSourceChainTestnet) {
      setIsTestnetMode(true)
    }
  }, [isSourceChainTestnet, setIsTestnetMode])
}
