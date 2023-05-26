import { useState, useEffect } from 'react'
import { useAccount, useProvider } from 'wagmi'

import { addressIsSmartContract } from '../util/AddressUtils'

export function useIsConnectedWithSmartContractWallet() {
  const provider = useProvider()
  const { address } = useAccount()

  const [result, setResult] = useState<boolean | undefined>(undefined)

  useEffect(() => {
    async function update() {
      if (typeof address !== 'undefined') {
        setResult(await addressIsSmartContract(address, provider))
      }
    }

    update()
  }, [address, provider])

  return result
}
