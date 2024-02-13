import { isNetwork } from '../util/networks'
import { useIsTestnetMode } from './useIsTestnetMode'
import { useNetworks } from './useNetworks'
import { useEffect } from 'react'

export const useSyncQueryParamsToTestnetMode = () => {
  const [{ sourceChain }] = useNetworks()
  const [, setIsTestnetMode] = useIsTestnetMode()

  useEffect(() => {
    // force test mode if source chain is testnet
    if (isNetwork(sourceChain.id).isTestnet) {
      setIsTestnetMode(true)
    }
  }, [setIsTestnetMode, sourceChain.id])
}
