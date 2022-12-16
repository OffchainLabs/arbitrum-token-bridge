import { useState, useEffect, useCallback, useMemo } from 'react'
import axios from 'axios'
import useSWR from 'swr'

export type ETHPrice = 'loading' | 'error' | number

export type UseETHPriceResult = {
  ethPrice: ETHPrice
  toUSD: (etherValue: number) => number
}

export function useETHPrice(): UseETHPriceResult {
  const [ethPrice, setETHPrice] = useState<ETHPrice>('loading')

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

  useEffect(
    () => setETHPrice(error ? 'error' : data?.ethereum?.usd),
    [data, error]
  )

  const toUSD = useCallback(
    (etherValue: number) => {
      const safeETHPrice = typeof ethPrice === 'number' ? ethPrice : 0
      return etherValue * safeETHPrice
    },
    [ethPrice]
  )

  return useMemo(() => ({ ethPrice, toUSD }), [ethPrice, toUSD])
}
