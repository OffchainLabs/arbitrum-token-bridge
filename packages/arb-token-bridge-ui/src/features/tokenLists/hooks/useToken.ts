import { useMemo } from 'react'
import { useTokens } from './useTokens'

export function useToken({
  sourceChainId,
  destinationChainId,
  tokenAddress
}: {
  sourceChainId: number
  destinationChainId: number
  tokenAddress: string | undefined
}) {
  const { sourceTokens, destinationTokens } = useTokens({
    sourceChainId,
    destinationChainId
  })

  return useMemo(() => {
    if (!tokenAddress) {
      return {
        sourceToken: null,
        destinationToken: null
      }
    }
    const token = sourceTokens[tokenAddress.toLowerCase()] ?? null
    const destinationAddress = token?.bridgeInfo[destinationChainId]

    return {
      sourceToken: token,
      destinationToken: destinationAddress
        ? destinationTokens[destinationAddress.tokenAddress]
        : null
    }
  }, [destinationChainId, destinationTokens, sourceTokens, tokenAddress])
}
