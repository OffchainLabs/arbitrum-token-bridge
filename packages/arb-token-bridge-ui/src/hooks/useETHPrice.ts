import { useCallback, useMemo } from 'react'
import axios from 'axios'
import useSWR from 'swr'

export type UseETHPriceResult = {
  ethPrice: number
  ethToUSD: (etherValue: number) => number
  error: Error
  isValidating: boolean
}

export function useETHPrice(): UseETHPriceResult {
  const { data, error, isValidating } = useSWR(
    'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
    url => axios.get(url).then(res => res.data),
    {
      refreshInterval: 30_000,
      shouldRetryOnError: true,
      errorRetryCount: 2,
      errorRetryInterval: 3_000
    }
  )

  const ethToUSD = useCallback(
    (etherValue: number) => {
      const ethPrice = data?.ethereum?.usd
      const safeETHPrice = typeof ethPrice === 'number' ? ethPrice : 0
      return etherValue * safeETHPrice
    },
    [data]
  )

  return useMemo(
    () => ({
      ethPrice: data?.ethereum?.usd,
      ethToUSD,
      error,
      isValidating
    }),
    [data, error, ethToUSD, isValidating]
  )
}
