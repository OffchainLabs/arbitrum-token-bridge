import { StaticJsonRpcProvider } from '@ethersproject/providers'

const sender = '0x2Ce910fBba65B454bBAf6A18c952A70f3bcd8299'
const l2Provider = new StaticJsonRpcProvider('https://arb1.arbitrum.io/rpc')
const l2ChainId = 42161

const baseQuery = {
  sender,
  l2ChainId,
  l2Provider,
  l2GatewayAddresses: [
    '0x09e9222E96E7B4AE2a407B98d48e330053351EEe', // L2 Standard Gateway
    '0x096760F208390250649E3e8763348E783AEF5562', // L2 Custom Gateway
    '0x6c411aD3E74De3E7Bd422b94A27770f5B86C623B' // L2 WETH Gateway
  ]
}

export function getQueryCoveringClassicOnlyWithoutResults() {
  // keeping the block range low (not fetching from 0) to make sure we don't run into event-log deadline-exceeded error #904
  return { ...baseQuery, fromBlock: 19411899, toBlock: 19416899 }
}

export function getQueryCoveringClassicOnlyWithResults() {
  return { ...baseQuery, fromBlock: 19416900, toBlock: 20961064 }
}

export function getQueryCoveringClassicAndNitroWithResults() {
  return { ...baseQuery, fromBlock: 21114936, toBlock: 35108652 }
}
