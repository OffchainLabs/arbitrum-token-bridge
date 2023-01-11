import { useCallback } from 'react'
import axios from 'axios'
import useSWR, { KeyedMutator } from 'swr'

export type UseETHPriceResult = {
  ethPrice: number
  ethToUSD: (etherValue: number) => number
  error?: Error
  isValidating: boolean
  mutate: KeyedMutator<any>
}

export function useETHPrice(): UseETHPriceResult {
  const { data, error, isValidating, mutate } = useSWR<number, Error>(
    'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
    url => axios.get(url).then(res => res.data.ethereum.usd),
    {
      refreshInterval: 30_000,
      shouldRetryOnError: true,
      errorRetryCount: 2,
      errorRetryInterval: 3_000
    }
  )

  const ethToUSD = useCallback(
    (etherValue: number) => {
      const safeETHPrice = typeof data === 'number' ? data : 0
      return etherValue * safeETHPrice
    },
    [data]
  )

  return { ethPrice: data ?? 0, ethToUSD, error, isValidating, mutate }
}
