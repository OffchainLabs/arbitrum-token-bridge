import { useMemo } from 'react'
import { useAccount, useNetwork } from 'wagmi'
import useSWRImmutable from 'swr/immutable'

import { trackEvent } from '../util/AnalyticsUtils'
import { isNetwork } from '../util/networks'
import { Address } from '../util/AddressUtils'
import { captureSentryErrorWithExtraData } from '../util/SentryUtils'

/**
 * Checks if an address is blocked using the external Screenings API service.
 * @param {Address} address - The address to check.
 * @returns {Promise<boolean>} true if blocked or the request fails
 */
async function isBlocked(address: Address): Promise<boolean> {
  try {
    if (
      process.env.NODE_ENV !== 'production' ||
      process.env.NEXT_PUBLIC_IS_E2E_TEST
    ) {
      return false
    }

    const url = new URL(process.env.SCREENING_API_ENDPOINT_V2 ?? '')
    url.searchParams.set('address', address)

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const { blocked } = await response.json()
    return blocked
  } catch (error) {
    captureSentryErrorWithExtraData({
      error,
      originFunction: 'isBlocked',
      additionalData: { address }
    })

    return true
  }
}

async function fetcher(address: Address): Promise<boolean> {
  const accountIsBlocked = await isBlocked(address)

  if (accountIsBlocked) {
    trackEvent('Address Block', { address })
  }

  return accountIsBlocked
}

export function useAccountIsBlocked() {
  const { address } = useAccount()
  const { chain } = useNetwork()

  const queryKey = useMemo(() => {
    if (typeof address === 'undefined') {
      // Don't fetch
      return null
    }

    if (isNetwork(chain?.id ?? 0).isTestnet) {
      // Don't fetch
      return null
    }

    return [address.toLowerCase(), 'useAccountIsBlocked']
  }, [address, chain?.id])

  const { data: isBlocked } = useSWRImmutable<boolean>(
    queryKey,
    // Extracts the first element of the query key as the fetcher param
    ([_address]) => fetcher(_address)
  )

  return { isBlocked }
}
