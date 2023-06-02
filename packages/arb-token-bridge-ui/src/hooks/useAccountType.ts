import { useState, useEffect } from 'react'
import { useAccount, useProvider } from 'wagmi'

import { addressIsSmartContract } from '../util/AddressUtils'

export function useAccountType() {
  const provider = useProvider()
  const { address } = useAccount()

  const [result, setResult] = useState<'EOA' | 'Smart Contract' | undefined>(
    undefined
  )

  useEffect(() => {
    async function update() {
      if (typeof address === 'undefined') {
        setResult(undefined)
        return
      }

      // TODO: Try to detect counterfactual/just-in-time deployed smart contract wallets

      if (await addressIsSmartContract(address, provider)) {
        setResult('Smart Contract')
        return
      }

      setResult('EOA')
    }

    update()
  }, [address, provider])

  return result
}
