import { useMemo } from 'react'
import { useTokenListsStore } from '../useTokenListsStore'

export function useTokens({
  sourceChainId,
  destinationChainId
}: {
  sourceChainId: number
  destinationChainId: number
}) {
  const { tokens } = useTokenListsStore()

  return useMemo(
    () => ({
      sourceTokens: tokens[sourceChainId] || {},
      destinationTokens: tokens[destinationChainId] || {}
    }),
    [destinationChainId, sourceChainId, tokens]
  )
}
