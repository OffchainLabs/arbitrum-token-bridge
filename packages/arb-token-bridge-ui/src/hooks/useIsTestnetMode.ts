import { useLocalStorage } from '@uidotdev/usehooks'
import { useMemo } from 'react'

const testnetModeLocalStorageKey = 'arbitrum:bridge:settings:testnetMode'

export const useIsTestnetMode = () => {
  const [isTestnetMode, setIsTestnetMode] = useLocalStorage<boolean>(
    testnetModeLocalStorageKey,
    false
  )

  return useMemo(
    () => [isTestnetMode, setIsTestnetMode] as const,
    [isTestnetMode, setIsTestnetMode]
  )
}
