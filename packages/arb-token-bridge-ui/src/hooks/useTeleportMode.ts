import { useMemo } from 'react'
import { isTeleport } from '../token-bridge-sdk/teleport'

export const useTeleportMode = ({
  sourceChainId,
  destinationChainId
}: {
  sourceChainId: number
  destinationChainId: number
}) => {
  return useMemo(
    () =>
      isTeleport({
        sourceChainId: sourceChainId,
        destinationChainId: destinationChainId
      }),
    [sourceChainId, destinationChainId]
  )
}
