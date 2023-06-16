import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'

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

export function useAccountIsBlocked(): boolean | undefined {
  const { address } = useAccount()
  const [result, setResult] = useState<boolean | undefined>(undefined)

  useEffect(() => {
    async function update() {
      if (typeof address !== 'undefined') {
        const accountIsBlocked = await isBlocked(address)

        if (accountIsBlocked) {
          trackEvent('Address Block')
        }

        setResult(accountIsBlocked)
      }
    }

    update()
  }, [address])

  return result
}
