import { useState, useEffect } from 'react'
import { useAccount, useProvider } from 'wagmi'

import { addressIsSmartContract } from '../util/AddressUtils'

type Result = {
  isEOA: boolean | undefined
  isSmartContractWallet: boolean | undefined
}

const defaultResult: Result = {
  isEOA: undefined,
  isSmartContractWallet: undefined
}

export function useAccountType() {
  const provider = useProvider()
  const { address } = useAccount()

  const [result, setResult] = useState<Result>(defaultResult)

  useEffect(() => {
    async function update() {
      if (typeof address === 'undefined') {
        setResult(defaultResult)
        return
      }

      // TODO: Try to detect counterfactual/just-in-time deployed smart contract wallets

      const isSmartContractWallet = await addressIsSmartContract(
        address,
        provider
      )

      setResult({
        isEOA: !isSmartContractWallet,
        isSmartContractWallet
      })
    }

    update()
  }, [address, provider])

  return result
}
