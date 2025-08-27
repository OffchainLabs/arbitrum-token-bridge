import { ChainId } from '../types/ChainId'

export type TeleportEnabledToken = {
  symbol: string
  l1Address: string
  allowedL3ChainIds: number[]
}

const teleportEnabledTokens: {
  [parentChainId: number]: TeleportEnabledToken[]
} = {
  [ChainId.Ethereum]: [
    {
      symbol: 'WETH',
      l1Address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
      allowedL3ChainIds: [1380012617]
    },
    {
      symbol: 'RARI',
      l1Address: '0xFca59Cd816aB1eaD66534D82bc21E7515cE441CF',
      allowedL3ChainIds: [1380012617] // only allowed for RARI
    }
  ],
  [ChainId.Sepolia]: [
    {
      symbol: 'WETH',
      l1Address: '0xfff9976782d46cc05630d1f6ebab18b2324d6b14',
      allowedL3ChainIds: [
        1918988905 // RARI Testnet
      ]
    },
    {
      symbol: 'LINK',
      l1Address: '0x779877A7B0D9E8603169DdbD7836e478b4624789',
      allowedL3ChainIds: [
        1918988905 // RARI Testnet
      ]
    }
  ]
}

export function isTeleportEnabledToken(
  erc20L1Address: string,
  parentChainId: number,
  childChainId: number
) {
  // check teleport enabled tokens and return true if the token is not enabled
  return (teleportEnabledTokens[parentChainId] ?? [])
    .filter(token => token.allowedL3ChainIds.includes(childChainId))
    .map(token => token.l1Address.toLowerCase())
    .includes(erc20L1Address.toLowerCase())
}
