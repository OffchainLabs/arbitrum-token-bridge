import useSWRImmutable from 'swr/immutable'
import { SWRResponse } from 'swr'
import { TokenListMap, TokensMap } from '../pages/api/tokenlist'
import { useMemo } from 'react'

const defaultEmpty = {}
export function useTokenLists(sourceChainId: number): SWRResponse<TokensMap> {
  const swrResponse = useSWRImmutable<TokenListMap>(
    ['useTokenLists'],
    async () => {
      const response = await fetch('/api/tokenlist')
      const data: { data: TokenListMap } = await response.json()
      // TODO: Handle error
      return data.data
    },
    {
      shouldRetryOnError: true,
      errorRetryCount: 2,
      errorRetryInterval: 1_000
    }
  )

  const data = useMemo(() => {
    if (!swrResponse.data) return defaultEmpty
    return swrResponse.data[sourceChainId] ?? defaultEmpty
  }, [swrResponse.data, sourceChainId])

  return {
    ...swrResponse,
    data
  }
}
