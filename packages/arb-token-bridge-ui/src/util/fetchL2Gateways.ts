import { Provider } from '@ethersproject/providers'
import { getArbitrumNetwork } from '@arbitrum/sdk'

import {
  l2ArbReverseGatewayAddresses,
  l2DaiGatewayAddresses,
  l2LptGatewayAddresses,
  l2MoonGatewayAddresses,
  l2wstETHGatewayAddresses
} from '../util/networks'

/**
 * Fetch L2 gateways for a given L2 network using its provider. Useful for specifying which gateways to use when fetching withdrawals.
 *
 * @param l2Provider Provider for the L2 network
 */
export async function fetchL2Gateways(l2Provider: Provider) {
  const l2Network = await getArbitrumNetwork(l2Provider)

  if (!l2Network.tokenBridge) {
    return []
  }

  /* configure gateway addresses for fetching withdrawals */
  const { childErc20Gateway, childCustomGateway, childWethGateway } =
    l2Network.tokenBridge
  const gatewaysToUse = [
    childErc20Gateway,
    childCustomGateway,
    childWethGateway
  ]
  const l2ArbReverseGateway = l2ArbReverseGatewayAddresses[l2Network.chainId]
  const l2DaiGateway = l2DaiGatewayAddresses[l2Network.chainId]
  const l2wstETHGateway = l2wstETHGatewayAddresses[l2Network.chainId]
  const l2LptGateway = l2LptGatewayAddresses[l2Network.chainId]
  const l2MoonGateway = l2MoonGatewayAddresses[l2Network.chainId]

  if (l2ArbReverseGateway) {
    gatewaysToUse.push(l2ArbReverseGateway)
  }
  if (l2DaiGateway) {
    gatewaysToUse.push(l2DaiGateway)
  }
  if (l2wstETHGateway) {
    gatewaysToUse.push(l2wstETHGateway)
  }
  if (l2LptGateway) {
    gatewaysToUse.push(l2LptGateway)
  }
  if (l2MoonGateway) {
    gatewaysToUse.push(l2MoonGateway)
  }

  return gatewaysToUse
}
