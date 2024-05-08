import { ChainId } from '../util/networks'
import { CommonAddress } from './CommonAddressUtils'

export type TeleportDisabledToken = {
  symbol: string
  l1Address: string
}

const teleportDisabledTokens: {
  [parentChainId: number]: TeleportDisabledToken[]
} = {
  [ChainId.Ethereum]: [
    {
      symbol: 'USDC',
      l1Address: CommonAddress.Ethereum.USDC
    }
  ],
  [ChainId.Sepolia]: [
    {
      symbol: 'USDC',
      l1Address: CommonAddress.Sepolia.USDC
    }
  ]
}

export function isTeleportDisabledToken(
  erc20L1Address: string,
  parentChainId: number
) {
  return (teleportDisabledTokens[parentChainId] ?? [])
    .map(token => token.l1Address.toLowerCase())
    .includes(erc20L1Address.toLowerCase())
}
