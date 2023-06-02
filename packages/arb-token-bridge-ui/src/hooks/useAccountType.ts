import { useState, useEffect } from 'react'
import { useAccount, useProvider } from 'wagmi'

import { addressIsSmartContract } from '../util/AddressUtils'

export function useAccountType() {
  const provider = useProvider()
  const { address } = useAccount()

  const [result, setResult] = useState<{
    isEOA: boolean | undefined
    isSmartContractWallet: boolean | undefined
  }>({
    isEOA: undefined,
    isSmartContractWallet: undefined
  })

  useEffect(() => {
    async function update() {
      if (typeof address === 'undefined') {
        setResult({
          isEOA: undefined,
          isSmartContractWallet: undefined
        })
        return
      }

      // TODO: Try to detect counterfactual/just-in-time deployed smart contract wallets

      const isSmartContractWallet = await addressIsSmartContract(
        address,
        provider
      )

      if (isSmartContractWallet) {
        setResult({
          isEOA: !isSmartContractWallet,
          isSmartContractWallet
        })
        return
      }

      setResult({
        isEOA: true,
        isSmartContractWallet: false
      })
    }

    update()
  }, [address, provider])

  return result
}
