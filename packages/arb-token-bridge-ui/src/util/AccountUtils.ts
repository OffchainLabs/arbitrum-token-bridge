import { getProviderForChainId } from '../token-bridge-sdk/utils'

export type AccountType =
  | 'externally-owned-account'
  | 'delegated-account'
  | 'smart-contract-wallet'

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
