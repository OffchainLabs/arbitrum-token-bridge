import { StaticJsonRpcProvider } from '@ethersproject/providers'

const receiver = '0xd898275e8b9428429155752f89fe0899ce232830'
const l2Provider = new StaticJsonRpcProvider('https://arb1.arbitrum.io/rpc')

const baseQuery = {
  receiver,
  l2Provider
}

export function getQueryCoveringClassicOnlyWithoutResults() {
  // keeping the block range low (not fetching from 0) to make sure we don't run into event-log deadline-exceeded error #904
  return { ...baseQuery, fromBlock: 20780771, toBlock: 20785771 }
}

export function getQueryCoveringClassicOnlyWithResults() {
  return { ...baseQuery, fromBlock: 20785772, toBlock: 22207816 }
}

export function getQueryCoveringClassicAndNitroWithResults() {
  return { ...baseQuery, fromBlock: 20785772, toBlock: 24905369 }
}
