import { Provider } from '@ethersproject/providers'

import { getAPIBaseUrl } from '.'
import { getProviderForChainId } from '../token-bridge-sdk/utils'

export type Address = `0x${string}`

export function addressesEqual(
  address1: string | undefined,
  address2: string | undefined
) {
  return address1?.trim().toLowerCase() === address2?.trim().toLowerCase()
}

export async function addressIsSmartContract(address: string, chainId: number) {
  const provider = getProviderForChainId(chainId)
  try {
    return (await provider.getCode(address)).length > 2
  } catch (_) {
    return false
  }
}

export async function addressIsDenylisted(address: string) {
  // The denylist consists of an array of addresses from Ethereum, Arbitrum One and Sepolia.
  // We do not separate them as it's unlikely for anyone to have a wallet address matching our contract addresses.
  try {
    const denylistResponse = await fetch(
      `${getAPIBaseUrl()}/api/denylist?address=${address}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }
    )
    return (await denylistResponse.json()).data as boolean
  } catch (error) {
    console.error(error)
    return false
  }
}

export function getNonce(
  address: string | undefined,
  { provider }: { provider: Provider }
): Promise<number> {
  if (typeof address === 'undefined') {
    return 0 as unknown as Promise<number>
  }

  return provider.getTransactionCount(address)
}
