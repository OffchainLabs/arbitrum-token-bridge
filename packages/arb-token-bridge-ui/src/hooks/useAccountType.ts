import { useAccount } from 'wagmi'
import useSWRImmutable from 'swr/immutable'

import { useNetworks } from './useNetworks'
import { AccountType, getAccountType } from '../util/AccountUtils'

type Result = {
  accountType: AccountType | undefined
  isLoading: boolean
}

export function useAccountType(addressOverride?: string): Result {
  const { address: walletAddress } = useAccount()
  // TODO: change to use connected chain when Safe wallet returns it correctly
  // atm Safe UI would try to switch connected chain even when user is at the correct chain
  // so the connected chain WAGMI returns is the wrong chain where the SCW is not deployed on
  const [{ sourceChain }] = useNetworks()

  const address = addressOverride ?? walletAddress

  const { data: accountType, isLoading } = useSWRImmutable(
    address && sourceChain ? [address, sourceChain.id, 'useAccountType'] : null,
    ([_address, chainId]) =>
      getAccountType({ address: _address, chainId: chainId }),
    {
      shouldRetryOnError: true,
      errorRetryCount: 2,
      errorRetryInterval: 5_000
    }
  )

  return {
    accountType,
    isLoading
  }
}
