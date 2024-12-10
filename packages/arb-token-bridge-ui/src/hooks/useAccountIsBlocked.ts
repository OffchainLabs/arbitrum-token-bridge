import { useMemo } from 'react'
import { useAccount } from 'wagmi'
import useSWRImmutable from 'swr/immutable'
import fetchRetry from 'fetch-retry'

import { trackEvent } from '../util/AnalyticsUtils'
import { Address } from '../util/AddressUtils'
import { captureSentryErrorWithExtraData } from '../util/SentryUtils'

const fetchWithRetry = fetchRetry(fetch, {
  retries: 3,
  retryDelay: (attempt: number) => attempt * 500 // should be short because it blocks the user
})

type BlockedResponse = { blocked: boolean; hasConnectionError: boolean }

/**
 * Checks if an address is blocked using the external Screenings API service.
 * @param {Address} address - The address to check.
 * @returns {Promise<BlockedResponse>}
 */
async function isBlocked(address: Address): Promise<BlockedResponse> {
  try {
    if (
      process.env.NODE_ENV !== 'production' ||
      process.env.NEXT_PUBLIC_IS_E2E_TEST
    ) {
      return { blocked: false, hasConnectionError: false }
    }

    const url = new URL(process.env.NEXT_PUBLIC_SCREENING_API_ENDPOINT ?? '')
    url.searchParams.set('address', address)
    url.searchParams.set('ref', window.location.hostname)

    const response = await fetchWithRetry(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })

    if (!response.ok) {
      const errorData = await response
        .text()
        .catch(() => 'Failed to get response text')
      throw new Error(`HTTP ${response.status}: ${errorData}`)
    }

    const { blocked } = await response.json()
    return { blocked, hasConnectionError: false }
  } catch (error) {
    console.error('Failed to check if address is blocked', error)
    captureSentryErrorWithExtraData({
      error,
      originFunction: 'isBlocked',
      additionalData: { address }
    })

    return { blocked: false, hasConnectionError: true }
  }
}

async function fetcher(address: Address): Promise<BlockedResponse> {
  const result = await isBlocked(address)

  if (result.blocked) {
    trackEvent('Address Block', { address })
  }

  return result
}

export function useAccountIsBlocked() {
  const { address } = useAccount()

  const queryKey = useMemo(() => {
    if (typeof address === 'undefined') {
      // Don't fetch
      return null
    }

    return [address.toLowerCase(), 'useAccountIsBlocked']
  }, [address])

  const { data, isLoading } = useSWRImmutable<BlockedResponse>(
    queryKey,
    // Extracts the first element of the query key as the fetcher param
    ([_address]) => fetcher(_address)
  )

  if (!address || isLoading) {
    return { isBlocked: false, hasConnectionError: false }
  }

  return {
    isBlocked: data?.blocked,
    hasConnectionError: data?.hasConnectionError
  }
}
