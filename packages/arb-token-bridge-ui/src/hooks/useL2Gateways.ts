/*
  Outputs the gateways which are valid for the user based on their L2 chain to fetch their withdrawals from.
*/

import { useEffect, useMemo, useState } from 'react'
import {
  l2DaiGatewayAddresses,
  l2LptGatewayAddresses,
  l2wstETHGatewayAddresses
} from '../util/networks'
import { Provider } from '@ethersproject/providers'
import { L2Network, getL2Network } from '@arbitrum/sdk'

export const useL2Gateways = ({ l2Provider }: { l2Provider: Provider }) => {
  const [l2Network, setL2Network] = useState<L2Network | undefined>(undefined)

  useEffect(() => {
    async function updateL2Network() {
      setL2Network(await getL2Network(l2Provider))
    }

    updateL2Network()
  })

  return useMemo(() => {
    if (typeof l2Network === 'undefined') {
      return []
    }

    /* configure gateway addresses for fetching withdrawals */
    const { l2ERC20Gateway, l2CustomGateway, l2WethGateway } =
      l2Network.tokenBridge
    const gatewaysToUse = [l2ERC20Gateway, l2CustomGateway, l2WethGateway]
    const l2DaiGateway = l2DaiGatewayAddresses[l2Network.chainID]
    const l2wstETHGateway = l2wstETHGatewayAddresses[l2Network.chainID]
    const l2LptGateway = l2LptGatewayAddresses[l2Network.chainID]
    if (l2DaiGateway) {
      gatewaysToUse.push(l2DaiGateway)
    }
    if (l2wstETHGateway) {
      gatewaysToUse.push(l2wstETHGateway)
    }
    if (l2LptGateway) {
      gatewaysToUse.push(l2LptGateway)
    }

    return gatewaysToUse
    // rest of the logic
  }, [l2Network])
}
