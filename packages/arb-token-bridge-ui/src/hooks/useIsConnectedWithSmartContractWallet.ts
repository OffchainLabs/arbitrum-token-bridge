import { useState, useEffect } from 'react'
import { useAccount, useProvider, useSignMessage } from 'wagmi'

import { addressIsSmartContract } from '../util/AddressUtils'
import { isUserRejectedError } from '../util/isUserRejectedError'

export function useIsConnectedWithSmartContractWallet() {
  const provider = useProvider()
  const { address } = useAccount()
  const { signMessageAsync } = useSignMessage()

  const [result, setResult] = useState<boolean | undefined>(undefined)

  useEffect(() => {
    async function update() {
      if (typeof address === 'undefined') {
        setResult(undefined)
        return
      }

      const nonce = await provider.getTransactionCount(address)
      const isMaybeUndeployedSmartContractWallet = nonce === 0

      if (isMaybeUndeployedSmartContractWallet) {
        try {
          await signMessageAsync({ message: 'TODO: What message?' })
        } catch (error) {
          if (!isUserRejectedError(error)) {
            setResult(true)
            return
          }
        }
      }

      // Check if the address is a smart contract
      setResult(await addressIsSmartContract(address, provider))
    }

    update()
  }, [address, provider, signMessageAsync])

  return result
}
