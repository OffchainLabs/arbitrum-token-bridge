import { useAccount, useProvider } from 'wagmi'
import useSWR from 'swr'

import { addressIsSmartContract } from '../util/AddressUtils'

type Result = {
  isEOA: boolean
  isSmartContractWallet: boolean
  isLoading: boolean
}

export function useAccountType(): Result {
  const { address } = useAccount()
  const provider = useProvider()

  const { data: isSmartContractWallet = false, isLoading } = useSWR(
    address ? [address, provider, 'useAccountType'] : null,
    ([_address, _provider]) => addressIsSmartContract(_address, _provider),
    {
      revalidateIfStale: false,
      shouldRetryOnError: true,
      errorRetryCount: 3,
      errorRetryInterval: 3_000
    }
  )

  // By default, assume it's an EOA
  return {
    isEOA: !isSmartContractWallet,
    isSmartContractWallet,
    isLoading
  }
}
