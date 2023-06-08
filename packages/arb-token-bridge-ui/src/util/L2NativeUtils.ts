import { ChainId } from '../util/networks'

export type L2NativeToken = {
  name: string
  symbol: string
  address: string
  decimals: number
  logoURI: string
}

const L2NativeTokens: { [chainId: number]: L2NativeToken[] } = {
  [ChainId.ArbitrumOne]: [
    {
      name: 'GMX',
      symbol: 'GMX',
      address: '0xfc5a1a6eb076a2c7ad06ed22c90d7e710e35ad0a',
      decimals: 18,
      logoURI: 'https://s2.coinmarketcap.com/static/img/coins/64x64/11857.png'
    },
    {
      name: 'STASIS EURO',
      symbol: 'EURS',
      address: '0xD22a58f79e9481D1a88e00c343885A588b34b68B',
      decimals: 2,
      logoURI: 'https://s2.coinmarketcap.com/static/img/coins/64x64/2989.png'
    },
    {
      name: 'USD Coin',
      symbol: 'USDC',
      address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      decimals: 6,
      logoURI: 'https://s2.coinmarketcap.com/static/img/coins/64x64/3408.png'
    }
  ],
  [ChainId.ArbitrumNova]: [],
  [ChainId.ArbitrumGoerli]: []
}

function find(erc20L2Address: string, l2ChainId: number) {
  return (
    (L2NativeTokens[l2ChainId] ?? [])
      //
      .find(
        token => token.address.toLowerCase() === erc20L2Address.toLowerCase()
      )
  )
}

export function tokenIsL2Native(erc20L2Address: string, l2ChainId: number) {
  return typeof find(erc20L2Address, l2ChainId) !== 'undefined'
}

export function getL2NativeToken(
  erc20L2Address: string,
  l2ChainId: number
): L2NativeToken {
  const token = find(erc20L2Address, l2ChainId)

  if (typeof token === 'undefined') {
    throw new Error(
      `Can't find L2-native token with address ${erc20L2Address} on chain ${l2ChainId}`
    )
  }

  return token
}
