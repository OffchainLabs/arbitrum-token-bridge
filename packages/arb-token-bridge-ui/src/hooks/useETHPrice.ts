import { useCallback, useMemo } from 'react'
import axios from 'axios'
import useSWR from 'swr'

export type ETHPrice = 'error' | number

export type UseETHPriceResult = {
  ethPrice: ETHPrice
  toUSD: (etherValue: number) => number
}

export function useETHPrice(): UseETHPriceResult {
  const { data, error } = useSWR(
    'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
    url => axios.get(url).then(res => res.data),
    {
      refreshInterval: 30_000,
      shouldRetryOnError: true,
      errorRetryCount: 2,
      errorRetryInterval: 3_000
    }
  )

  const toUSD = useCallback(
    (etherValue: number) => {
      const ethPrice = data?.ethereum?.usd
      const safeETHPrice = typeof ethPrice === 'number' ? ethPrice : 0
      return etherValue * safeETHPrice
    },
    [data]
  )

  return useMemo(
    () => ({ ethPrice: error ? 'error' : data?.ethereum?.usd, toUSD }),
    [data, error, toUSD]
  )
}
