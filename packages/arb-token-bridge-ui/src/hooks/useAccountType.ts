import { useAccount, useProvider } from 'wagmi'
import useSWRImmutable from 'swr/immutable'

import { addressIsSmartContract } from '../util/AddressUtils'

type Result = {
  isEOA: boolean
  isSmartContractWallet: boolean
}

export function useAccountType(): Result {
  const { address } = useAccount()
  const provider = useProvider()

  const { data: isSmartContractWallet = false } = useSWRImmutable(
    address ? [address, provider, 'useAccountType'] : null,
    ([_address, _provider]) => addressIsSmartContract(_address, _provider)
  )

  // By default, assume it's an EOA
  return {
    isEOA: !isSmartContractWallet,
    isSmartContractWallet
  }
}
