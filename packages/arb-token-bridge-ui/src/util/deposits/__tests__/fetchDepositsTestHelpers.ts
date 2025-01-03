import { getArbitrumNetwork } from '@arbitrum/sdk'

const arbSepoliaTokenBridge = getArbitrumNetwork(42161).tokenBridge!

const baseQuery = {
  l2ChainId: 42161,
  childChainId: 42161,
  parentChainId: 1,
  parentGatewayAddresses: [
    arbSepoliaTokenBridge.parentErc20Gateway,
    arbSepoliaTokenBridge.parentCustomGateway,
    arbSepoliaTokenBridge.parentWethGateway
  ]
}

export function getQueryCoveringClassicOnlyWithoutResults() {
  return { ...baseQuery, fromBlock: 0, toBlock: 14309825 }
}

export function getQueryCoveringClassicOnlyWithResults() {
  return { ...baseQuery, fromBlock: 14309825, toBlock: 14428639 }
}

export function getQueryCoveringClassicAndNitroWithResults() {
  return { ...baseQuery, fromBlock: 15362737, toBlock: 15517648 }
}
