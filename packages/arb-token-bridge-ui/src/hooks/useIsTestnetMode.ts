import { useLocalStorage } from 'react-use'

const testnetModeLocalStorageKey = 'arbitrum:bridge:settings:testnetMode'

export const useIsTestnetMode = () => {
  return useLocalStorage<boolean>(testnetModeLocalStorageKey)
}
