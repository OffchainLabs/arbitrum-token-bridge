import { useMemo } from 'react'
import { useAccount } from 'wagmi'
import useSWRImmutable from 'swr/immutable'
import { usePostHog } from 'posthog-js/react'

import { ApiResponseSuccess } from '../pages/api/screenings'

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

async function fetcher(
  address: `0x${string}`,
  onAccountBlocked: () => void
): Promise<boolean> {
  const accountIsBlocked = await isBlocked(address)

  if (accountIsBlocked) {
    onAccountBlocked()
  }

  return accountIsBlocked
}

export function useAccountIsBlocked() {
  const posthog = usePostHog()
  const { address } = useAccount()

  const queryKey = useMemo(() => {
    if (typeof address === 'undefined') {
      // Don't fetch
      return null
    }

    return [address.toLowerCase(), 'useAccountIsBlocked']
  }, [address])

  function onAccountBlocked() {
    posthog?.capture('Address Block', { address })
  }

  const { data: isBlocked } = useSWRImmutable<boolean>(
    queryKey,
    // Extracts the first element of the query key as the fetcher param
    ([_address]) => fetcher(_address, onAccountBlocked)
  )

  return { isBlocked }
}
