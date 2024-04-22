import { useAccount } from 'wagmi'
import useSWRImmutable from 'swr/immutable'

import { addressIsSmartContract } from '../util/AddressUtils'
import { useNetworks } from './useNetworks'

type Result = {
  isEOA: boolean
  isSmartContractWallet: boolean
  isLoading: boolean
}

export function useAccountType(): Result {
  const { address } = useAccount()
  const [{ sourceChainProvider }] = useNetworks()

  const { data: isSmartContractWallet = false, isLoading } = useSWRImmutable(
    address ? [address, sourceChainProvider, 'useAccountType'] : null,
    ([_address, _provider]) => addressIsSmartContract(_address, _provider)
  )

  // By default, assume it's an EOA
  return {
    isEOA: !isSmartContractWallet,
    isSmartContractWallet,
    isLoading
  }
}
