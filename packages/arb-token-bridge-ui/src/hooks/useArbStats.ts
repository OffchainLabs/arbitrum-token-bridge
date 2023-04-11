import useSWR from 'swr'
import { getAPIBaseUrl } from '../util'
import { ArbStats } from '../pages/api/arbstats'
import { useNetworksAndSigners } from './useNetworksAndSigners'

export const useArbStats = () => {
  const {
    l2: {
      network: { chainID: l2ChainId }
    }
  } = useNetworksAndSigners()

  return useSWR(
    'arbstats',
    async () => {
      const response = await fetch(
        `${getAPIBaseUrl()}/api/arbstats?l2ChainId=${l2ChainId}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }
      )
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
