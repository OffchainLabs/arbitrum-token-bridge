import { useState, useEffect, useCallback, useMemo } from 'react'
import axios from 'axios'

export type ETHPrice = 'loading' | 'error' | number

export type UseETHPriceResult = {
  ethPrice: ETHPrice
  toUSD: (etherValue: number) => number
}

export function useETHPrice(): UseETHPriceResult {
  const [ethPrice, setETHPrice] = useState<ETHPrice>('loading')

  useEffect(() => {
    async function fetchETHPrice() {
      try {
        const response = await axios.get(
          'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd'
        )

        setETHPrice(response.data.ethereum.usd)
      } catch (error) {
        setETHPrice('error')
      }
    }

    fetchETHPrice()
  }, [])

  const toUSD = useCallback(
    (etherValue: number) => {
      const safeETHPrice = typeof ethPrice === 'number' ? ethPrice : 0
      return etherValue * safeETHPrice
    },
    [ethPrice]
  )

  return useMemo(() => ({ ethPrice, toUSD }), [ethPrice, toUSD])
}
