import { useNetwork } from 'wagmi'
import { useLocalStorage } from 'react-use'

import { isNetwork } from '../util/networks'

const testnetModeLocalStorageKey = 'arbitrum:bridge:settings:testnetMode'

export const useIsTestnetMode = () => {
  const { chain } = useNetwork()

  const [isTestnetMode, setIsTestnetMode] = useLocalStorage<boolean>(
    testnetModeLocalStorageKey,
    false
  )

  if (!chain) {
    return [undefined, setIsTestnetMode] as const
  }

  if (isNetwork(chain.id).isTestnet) {
    return [true, setIsTestnetMode] as const
  }

  return [isTestnetMode, setIsTestnetMode] as const
}
