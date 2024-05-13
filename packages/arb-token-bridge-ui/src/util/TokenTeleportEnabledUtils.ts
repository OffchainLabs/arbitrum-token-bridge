import { ChainId } from './networks'

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
    },
    {
      symbol: 'RARI',
      l1Address: '0xFca59Cd816aB1eaD66534D82bc21E7515cE441CF'
    }
  ],
  [ChainId.Sepolia]: [
    {
      symbol: 'WETH',
      l1Address: '0xfff9976782d46cc05630d1f6ebab18b2324d6b14'
    },
    {
      symbol: 'LINK',
      l1Address: '0x779877A7B0D9E8603169DdbD7836e478b4624789'
    }
  ]
}

export function isTeleportEnabledToken(
  erc20L1Address: string,
  parentChainId: number
) {
  // check teleport enabled tokens and return true if the token is not enabled
  return (teleportEnabledTokens[parentChainId] ?? [])
    .map(token => token.l1Address.toLowerCase())
    .includes(erc20L1Address.toLowerCase())
}
