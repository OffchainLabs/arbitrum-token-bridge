import { useEffect, useState } from 'react'
import { BigNumber } from 'ethers'

import { useNetworksAndSigners } from './useNetworksAndSigners'

export type UseGasPriceResult = {
  l1GasPrice: BigNumber
  l2GasPrice: BigNumber
}

export function useGasPrice(): UseGasPriceResult {
  const {
    l1: { provider: l1Provider },
    l2: { provider: l2Provider }
  } = useNetworksAndSigners()

  const [result, setResult] = useState<UseGasPriceResult>({
    l1GasPrice: BigNumber.from(0),
    l2GasPrice: BigNumber.from(0)
  })

  useEffect(() => {
    async function fetchGasPrice() {
      const [l1GasPrice, l2GasPrice] = await Promise.all([
        l1Provider.getGasPrice(),
        l2Provider.getGasPrice()
      ])

      setResult({ l1GasPrice, l2GasPrice })
    }

    fetchGasPrice()
  }, [l1Provider, l2Provider])

  return result
}
