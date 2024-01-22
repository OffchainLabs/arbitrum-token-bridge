import { useCallback } from 'react'
import useSWR, { KeyedMutator } from 'swr'
import { getAPIBaseUrl } from '../util'

export type UseETHPriceResult = {
  ethPrice: number
  ethToUSD: (etherValue: number) => number
  error?: Error
  isValidating: boolean
  mutate: KeyedMutator<any>
}

export function useETHPrice(): UseETHPriceResult {
  const { data, error, isValidating, mutate } = useSWR<number, Error>(
    'eth/usd',
    async () => {
      const response = await fetch(`${getAPIBaseUrl()}/api/ethPrice`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })
      const price: number = (await response.json()).data
      return price
    },
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
