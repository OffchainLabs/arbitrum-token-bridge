import { ChainId } from '../util/networks'

export type TransferDisabledToken = {
  symbol: string
  l1Address: string
  l2Address: string
}

const transferDisabledTokens: { [chainId: number]: TransferDisabledToken[] } = {
  [ChainId.ArbitrumOne]: [
    {
      symbol: 'rDPX',
      l1Address: '0x0ff5A8451A839f5F0BB3562689D9A44089738D11',
      l2Address: '0x32Eb7902D4134bf98A28b963D26de779AF92A212'
    }
  ]
}

/**
 *
 * @param erc20L1Address
 * @param chainId - Arbitrum chain id
 */
export function isTransferDisabledToken(
  erc20L1Address: string,
  chainId: number
) {
  return (transferDisabledTokens[chainId] ?? [])
    .map(token => token.l1Address.toLowerCase())
    .includes(erc20L1Address.toLowerCase())
}
