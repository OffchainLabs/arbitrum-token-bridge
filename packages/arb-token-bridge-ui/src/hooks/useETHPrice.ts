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
    'https://api.coinbase.com/v2/prices/ETH-USD/spot',
    url => axios.get(url).then(res => res.data.data.amount),
    {
      refreshInterval: 300_000, // 5 minutes
      shouldRetryOnError: true,
      errorRetryCount: 2,
      errorRetryInterval: 3_000
    }
  )

  const ethToUSD = useCallback(
    (etherValue: number) => {
      const safeETHPrice = data && !isNaN(data) ? Number(data) : 0
      return etherValue * safeETHPrice
    },
    [data]
  )

  return { ethPrice: data ?? 0, ethToUSD, error, isValidating, mutate }
}
