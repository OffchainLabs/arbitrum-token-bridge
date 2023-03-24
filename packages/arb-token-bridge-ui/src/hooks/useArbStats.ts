import useSWR from 'swr'
import { ArbStats } from '../pages/api/arbstats'

export const useArbStats = () => {
  return useSWR(
    'arbstats',
    async () => {
      const response = await fetch(`/api/arbstats`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })
      return (await response.json()).data as ArbStats
    },
    {
      refreshInterval: 30_000,
      shouldRetryOnError: true,
      errorRetryCount: 2,
      errorRetryInterval: 3_000
    }
  )
}
