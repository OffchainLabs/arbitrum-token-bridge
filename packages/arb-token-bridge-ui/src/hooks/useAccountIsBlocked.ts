import { useMemo } from 'react'
import { useAccount, useNetwork } from 'wagmi'
import useSWRImmutable from 'swr/immutable'

import { ApiResponseSuccess } from '../pages/api/screenings'
import { trackEvent } from '../util/AnalyticsUtils'
import { isNetwork } from '../util/networks'
import { Address } from '../util/AddressUtils'

async function isBlocked(address: Address): Promise<boolean> {
  if (
    process.env.NODE_ENV !== 'production' ||
    process.env.NEXT_PUBLIC_IS_E2E_TEST
  ) {
    return false
  }

  const searchParams = new URLSearchParams({ address })
  const response = await fetch('/api/screenings?' + searchParams, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  })

  if (!response.ok) {
    return false
  }

  return ((await response.json()) as ApiResponseSuccess).blocked
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
