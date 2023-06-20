import { useMemo } from 'react'
import { useAccount } from 'wagmi'
import useSWR from 'swr'

import { ApiResponseSuccess } from '../pages/api/screenings'
import { trackEvent } from '../util/AnalyticsUtils'

async function isBlocked(address: `0x${string}`): Promise<boolean> {
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

async function fetcher(address: `0x${string}`) {
  const accountIsBlocked = await isBlocked(address)

  if (accountIsBlocked) {
    trackEvent('Address Block')
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

    return ['useAccountIsBlocked', address]
  }, [address])

  return useSWR<boolean>(queryKey, ([, _address]) => fetcher(_address))
}
