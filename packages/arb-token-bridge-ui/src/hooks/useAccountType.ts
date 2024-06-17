import { useAccount, useNetwork } from 'wagmi'
import useSWRImmutable from 'swr/immutable'

import { addressIsSmartContract } from '../util/AddressUtils'

type Result = {
  isEOA: boolean
  isSmartContractWallet: boolean
  isLoading: boolean
}

export function useAccountType(): Result {
  const { chain } = useNetwork()
  const { address, isConnected } = useAccount()

  const { data: isSmartContractWallet = false, isLoading } = useSWRImmutable(
    address && isConnected && chain
      ? [address, chain.id, 'useAccountType']
      : null,
    ([_address, chainId]) => addressIsSmartContract(_address, chainId),
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
