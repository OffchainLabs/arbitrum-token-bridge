import { ChainId } from '../util/networks'

export type TeleportEnabledToken = {
  symbol: string
  l1Address: string
}

const teleportEnabledTokens: {
  [parentChainId: number]: TeleportEnabledToken[]
} = {
  [ChainId.Ethereum]: [
    {
      symbol: 'WETH',
      l1Address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'
    }
  ],
  [ChainId.Sepolia]: [
    {
      symbol: 'WETH',
      l1Address: '0xfff9976782d46cc05630d1f6ebab18b2324d6b14'
    }
  ]
}

export function isTeleportDisabledToken(
  erc20L1Address: string,
  parentChainId: number
) {
  // check teleport enabled tokens and return true if the token is not enabled
  return !(teleportEnabledTokens[parentChainId] ?? [])
    .map(token => token.l1Address.toLowerCase())
    .includes(erc20L1Address.toLowerCase())
}
