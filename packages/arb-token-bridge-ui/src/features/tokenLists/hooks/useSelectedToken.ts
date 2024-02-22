import { useAppState } from '../../../state'
import { useToken } from './useToken'

export function useSelectedToken({
  sourceChainId,
  destinationChainId
}: {
  sourceChainId: number
  destinationChainId: number
}) {
  const {
    app: { selectedToken }
  } = useAppState()

  return useToken({
    sourceChainId: sourceChainId,
    destinationChainId: destinationChainId,
    tokenAddress: selectedToken?.address
  })
}
