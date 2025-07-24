import { useAccount } from 'wagmi'
import useSWRImmutable from 'swr/immutable'

import { useNetworks } from './useNetworks'
import { getProviderForChainId } from '@/token-bridge-sdk/utils'

export type AccountType =
  | 'externally-owned-account'
  | 'delegated-account'
  | 'smart-contract-wallet'

type Result =
  | {
      accountType: AccountType
      isLoading: false
    }
  | {
      accountType: undefined
      isLoading: true
    }

export async function getAccountType({
  address,
  chainId
}: {
  address: string
  chainId: number
}): Promise<AccountType | undefined> {
  const provider = getProviderForChainId(chainId)
  try {
    const code = await provider.getCode(address)
    // delegation designator prefix for 7702
    if (code.startsWith('0xef01')) {
      return 'delegated-account'
    }
    if (code.length > 2) {
      return 'smart-contract-wallet'
    }
    return 'externally-owned-account'
  } catch (_) {
    return undefined
  }
}

export function useAccountType(addressOverride?: string): Result {
  const { address: walletAddress } = useAccount()
  // TODO: change to use connected chain when Safe wallet returns it correctly
  // atm Safe UI would try to switch connected chain even when user is at the correct chain
  // so the connected chain WAGMI returns is the wrong chain where the SCW is not deployed on
  const [{ sourceChain }] = useNetworks()

  const address = addressOverride ?? walletAddress

  const { data: accountType } = useSWRImmutable(
    address && sourceChain ? [address, sourceChain.id, 'useAccountType'] : null,
    ([_address, chainId]) =>
      getAccountType({ address: _address, chainId: chainId }),
    {
      shouldRetryOnError: true,
      errorRetryCount: 2,
      errorRetryInterval: 5_000
    }
  )

  if (!accountType) {
    return {
      accountType: undefined,
      isLoading: true
    }
  }

  return {
    accountType,
    isLoading: false
  }
}
