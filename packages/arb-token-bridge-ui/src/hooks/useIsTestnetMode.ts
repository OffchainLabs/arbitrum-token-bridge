import { useLocalStorage } from 'react-use'

const testnetModeLocalStorageKey = 'arbitrum:bridge:settings:testnetMode'

export const useIsTestnetMode = () => {
  const [isTestnetMode, setIsTestnetMode] = useLocalStorage<boolean>(
    testnetModeLocalStorageKey
  )

  return [isTestnetMode, setIsTestnetMode] as const
}
