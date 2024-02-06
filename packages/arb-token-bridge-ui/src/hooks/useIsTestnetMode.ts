import { useLocalStorage } from '@uidotdev/usehooks'

const testnetModeLocalStorageKey = 'arbitrum:bridge:settings:testnetMode'

export const useIsTestnetMode = () => {
  const [isTestnetMode, setIsTestnetMode] = useLocalStorage<boolean>(
    testnetModeLocalStorageKey,
    false
  )

  return { isTestnetMode, setIsTestnetMode } as const
}
