import { StaticJsonRpcProvider } from '@ethersproject/providers'

const toAddress = '0xd898275e8b9428429155752f89fe0899ce232830'
const l2Provider = new StaticJsonRpcProvider('https://arb1.arbitrum.io/rpc')

const baseQuery = {
  toAddress,
  l2Provider
}

export function getQueryForBlock(block: number) {
  return { ...baseQuery, fromBlock: block - 1, toBlock: block + 1 }
}
