import { useMemo } from 'react'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import {
  l2DaiGatewayAddresses,
  l2LptGatewayAddresses,
  l2wstETHGatewayAddresses
} from '../../util/networks'

export const useGateways = () => {
  const { l2 } = useNetworksAndSigners()

  /* configure gateway addresses for fetching withdrawals */
  const { l2ERC20Gateway, l2CustomGateway, l2WethGateway } =
    l2.network.tokenBridge
  const gatewaysToUse = [l2ERC20Gateway, l2CustomGateway, l2WethGateway]
  const l2DaiGateway = l2DaiGatewayAddresses[l2.network.chainID]
  const l2wstETHGateway = l2wstETHGatewayAddresses[l2.network.chainID]
  const l2LptGateway = l2LptGatewayAddresses[l2.network.chainID]
  if (l2DaiGateway) {
    gatewaysToUse.push(l2DaiGateway)
  }
  if (l2wstETHGateway) {
    gatewaysToUse.push(l2wstETHGateway)
  }
  if (l2LptGateway) {
    gatewaysToUse.push(l2LptGateway)
  }

  return useMemo(() => gatewaysToUse, [l2.network.tokenBridge])
}
