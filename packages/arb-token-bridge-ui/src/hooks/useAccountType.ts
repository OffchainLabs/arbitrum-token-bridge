import { useAccount, useNetwork } from 'wagmi'
import useSWRImmutable from 'swr/immutable'

import { addressIsSmartContract } from '../util/AddressUtils'

type Result = {
  isEOA: boolean
  isSmartContractWallet: boolean
  isLoading: boolean
}

export function useAccountType(): Result {
  const { address } = useAccount()
  const { chain } = useNetwork()

  const { data: isSmartContractWallet = false, isLoading } = useSWRImmutable(
    address && chain ? [address, chain.id, 'useAccountType'] : null,
    ([_address, _chainId]) => addressIsSmartContract(_address, _chainId),
    {
      shouldRetryOnError: true,
      errorRetryCount: 2,
      errorRetryInterval: 5_000
    }
  )

  // By default, assume it's an EOA
  return {
    isEOA: !isSmartContractWallet,
    isSmartContractWallet,
    isLoading
  }
}
