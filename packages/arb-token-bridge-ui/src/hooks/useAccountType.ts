import { Address, useAccount } from 'wagmi'
import useSWRImmutable from 'swr/immutable'

import { addressIsSmartContract } from '../util/AddressUtils'
import { useNetworks } from './useNetworks'

type Result = {
  isEOA: boolean
  isSmartContractWallet: boolean
  isLoading: boolean
}

export function useAccountType({
  address
}: { address?: Address } = {}): Result {
  const { address: connectedAddress } = useAccount()
  // TODO: change to use connected chain when Safe wallet returns it correctly
  // atm Safe UI would try to switch connected chain even when user is at the correct chain
  // so the connected chain WAGMI returns is the wrong chain where the SCW is not deployed on
  const [{ sourceChain }] = useNetworks()

  const addressToUse = address || connectedAddress

  const { data: isSmartContractWallet = false, isLoading } = useSWRImmutable(
    addressToUse && sourceChain
      ? [addressToUse, sourceChain.id, 'useAccountType']
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
