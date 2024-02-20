import { useMemo } from 'react'
import { useAppState } from '../../../state'
import { useTokens } from './useTokens'

export function useSelectedToken({
  sourceChainId,
  destinationChainId
}: {
  sourceChainId: number
  destinationChainId: number
}) {
  const { destinationTokens } = useTokens({
    sourceChainId,
    destinationChainId
  })
  const {
    app: { selectedToken }
  } = useAppState()

  return useMemo(() => {
    const destinationAddress = selectedToken?.bridgeInfo[destinationChainId]

    return {
      sourceSelectedToken: selectedToken,
      destinationSelectedToken: destinationAddress
        ? destinationTokens[destinationAddress.tokenAddress]
        : null
    }
  }, [destinationChainId, destinationTokens, selectedToken])
}
