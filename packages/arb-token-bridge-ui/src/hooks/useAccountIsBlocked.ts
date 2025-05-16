import { useMemo } from 'react'
import { useAccount } from 'wagmi'
import useSWRImmutable from 'swr/immutable'

import { trackEvent } from '../util/AnalyticsUtils'
import { Address } from '../util/AddressUtils'
import { captureSentryErrorWithExtraData } from '../util/SentryUtils'
import {
  isE2eTestingEnvironment,
  isProductionEnvironment
} from '../util/CommonUtils'

/**
 * Checks if an address is blocked using the external Screenings API service.
 * @param {Address} address - The address to check.
 * @returns {Promise<boolean>} true if blocked or the request fails
 */
async function isBlocked(address: Address): Promise<boolean> {
  try {
    if (!isProductionEnvironment || isE2eTestingEnvironment) {
      return false
    }

    const url = new URL(process.env.NEXT_PUBLIC_SCREENING_API_ENDPOINT ?? '')
    url.searchParams.set('address', address)
    url.searchParams.set('ref', window.location.hostname)

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
    console.error('Failed to check if address is blocked', error)
    captureSentryErrorWithExtraData({
      error,
      originFunction: 'isBlocked',
      additionalData: { address }
    })

    return false
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

  const queryKey = useMemo(() => {
    if (typeof address === 'undefined') {
      // Don't fetch
      return null
    }

    return [
      address.toLocaleLowerCase() as Address,
      'useAccountIsBlocked'
    ] as const
  }, [address])

  const { data: isBlocked } = useSWRImmutable(
    queryKey,
    // Extracts the first element of the query key as the fetcher param
    ([_address]) => fetcher(_address)
  )

  return { isBlocked }
}
