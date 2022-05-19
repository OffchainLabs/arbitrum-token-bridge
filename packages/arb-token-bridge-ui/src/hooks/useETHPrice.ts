import { useState, useEffect } from 'react'
import axios from 'axios'

export type UseETHPriceResult = 'loading' | 'error' | number

export function useETHPrice() {
  const [result, setResult] = useState<UseETHPriceResult>('loading')

  useEffect(() => {
    async function fetchETHPrice() {
      try {
        const response = await axios.get(
          'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd'
        )

        setResult(response.data.ethereum.usd)
      } catch (error) {
        setResult('error')
      }
    }

    fetchETHPrice()
  }, [])

  return result
}
