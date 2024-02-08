import { Provider } from '@ethersproject/providers'

import { getAPIBaseUrl } from '.'

export type Address = `0x${string}`

export async function addressIsSmartContract(
  address: string,
  provider: Provider
) {
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
