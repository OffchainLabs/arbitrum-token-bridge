import { useSwitchNetwork } from 'wagmi'

import {
  handleSwitchNetworkError,
  handleSwitchNetworkOnMutate
} from '../util/networks'

type SwitchNetworkConfig = {
  isSwitchingNetworkBeforeTx?: boolean
}

export function useSwitchNetworkWithConfig({
  isSwitchingNetworkBeforeTx = false
}: SwitchNetworkConfig = {}) {
  const config = {
    throwForSwitchChainNotSupported: true,
    onMutate: () => handleSwitchNetworkOnMutate({ isSwitchingNetworkBeforeTx }),
    onError: handleSwitchNetworkError
  }

  const { switchNetwork, switchNetworkAsync } = useSwitchNetwork(config)

  return { switchNetwork, switchNetworkAsync }
}
