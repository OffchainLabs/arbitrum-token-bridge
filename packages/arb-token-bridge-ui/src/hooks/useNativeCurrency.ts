import { Provider } from '@ethersproject/providers'
import useSWRImmutable from 'swr/immutable'

import { ether } from '../constants'

type NativeCurrencyBase = {
  name: string
  symbol: string
  decimals: number
  logoUrl?: string
}

export type NativeCurrencyEther = NativeCurrencyBase & {
  isCustom: false
}

export type NativeCurrencyErc20 = NativeCurrencyBase & {
  isCustom: true
  /**
   * Address of the ERC-20 token contract on the parent chain.
   */
  address: string
}

export type NativeCurrency = NativeCurrencyEther | NativeCurrencyErc20

const nativeCurrencyEther: NativeCurrencyEther = {
  ...ether,
  logoUrl:
    'https://raw.githubusercontent.com/ethereum/ethereum-org-website/957567c341f3ad91305c60f7d0b71dcaebfff839/src/assets/assets/eth-diamond-black-gray.png',
  isCustom: false
}

export function useNativeCurrency({
  provider
}: {
  provider: Provider
}): NativeCurrency {
  const { data = nativeCurrencyEther } = useSWRImmutable(
    ['nativeCurrency', provider],
    ([, _provider]) => fetchNativeCurrency({ provider: _provider }),
    {
      shouldRetryOnError: true,
      errorRetryCount: 2,
      errorRetryInterval: 1_000
    }
  )

  return data
}

export async function fetchNativeCurrency({
  provider
}: {
  provider: Provider
}): Promise<NativeCurrency> {
  return nativeCurrencyEther
}
