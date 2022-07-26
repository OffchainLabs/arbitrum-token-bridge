import { useEffect, useState } from 'react'
import { BigNumber } from 'ethers'

import { useNetworksAndSigners } from './useNetworksAndSigners'

export type UseGasPriceResult = {
  l1GasPrice: BigNumber
  l2GasPrice: BigNumber
}

export function useGasPrice(): UseGasPriceResult {
  const { l1, l2 } = useNetworksAndSigners()

  const [result, setResult] = useState<UseGasPriceResult>({
    l1GasPrice: BigNumber.from(0),
    l2GasPrice: BigNumber.from(0)
  })

  useEffect(() => {
    async function fetchGasPrice() {
      const l1Signer = l1.signer
      const l2Signer = l2.signer

      if (typeof l1Signer === 'undefined' || typeof l2Signer === 'undefined') {
        return
      }

      const [l1GasPrice, l2GasPrice] = await Promise.all([
        l1Signer.provider.getGasPrice(),
        l2Signer.provider.getGasPrice()
      ])

      setResult({ l1GasPrice, l2GasPrice })
    }

    fetchGasPrice()
  }, [l1.signer, l2.signer])

  return result
}
