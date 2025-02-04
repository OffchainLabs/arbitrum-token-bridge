import { ChainId } from '../types/ChainId'
import { CommonAddress } from './CommonAddressUtils'

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
    },
    {
      symbol: 'FU',
      l1Address: '0x43df01681966d5339702e96ef039e481b9da20c1',
      l2Address: '0x9aee3C99934C88832399D6C6E08ad802112eBEab'
    },
    {
      symbol: 'USDT', // disable USDT transfers during OFT migration
      l1Address: CommonAddress.Ethereum.USDT,
      l2Address: CommonAddress.ArbitrumOne.USDT
    }
  ]
}

export function isTransferDisabledToken(
  erc20L1Address: string,
  childChainId: number
) {
  return (transferDisabledTokens[childChainId] ?? [])
    .map(token => token.l1Address.toLowerCase())
    .includes(erc20L1Address.toLowerCase())
}
