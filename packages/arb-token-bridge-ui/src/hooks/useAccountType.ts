import { useAccount, useProvider } from 'wagmi'
import { useEffect, useState } from 'react'

import { addressIsSmartContract } from '../util/AddressUtils'

type Result = {
  isEOA: boolean
  isSmartContractWallet: boolean
  isLoading: boolean
}

export function useAccountType(): Result {
  const { address } = useAccount()
  const provider = useProvider()
  const [isLoading, setIsLoading] = useState(true)
  const [isSmartContractWallet, setIsSmartContractWallet] = useState(false)

  useEffect(() => {
    setIsLoading(true)
    async function getAccountType() {
      if (address && provider) {
        const isSmartContract = await addressIsSmartContract(address, provider)
        setIsSmartContractWallet(isSmartContract)
        setIsLoading(false)
      }
    }
    getAccountType()
  }, [address, provider])

  // By default, assume it's an EOA
  return {
    isEOA: !isSmartContractWallet,
    isSmartContractWallet,
    isLoading
  }
}
