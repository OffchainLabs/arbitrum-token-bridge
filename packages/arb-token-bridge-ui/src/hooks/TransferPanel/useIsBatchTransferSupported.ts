import { useAppState } from '../../state'
import { getTransferMode } from '../../util/getTransferMode'
import { isTokenNativeUSDC } from '../../util/TokenUtils'
import { useNetworks } from '../useNetworks'

export const useIsBatchTransferSupported = () => {
  const [{ sourceChain, destinationChain }] = useNetworks()
  const transferMode = getTransferMode({
    sourceChainId: sourceChain.id,
    destinationChainId: destinationChain.id
  })
  const {
    app: { selectedToken }
  } = useAppState()

  if (!selectedToken) {
    return false
  }
  if (transferMode === 'withdrawal') {
    return false
  }
  if (isTokenNativeUSDC(selectedToken.address)) {
    return false
  }
  // TODO: teleport is disabled for now but it needs to be looked into more to check whether it is or can be supported
  if (transferMode === 'teleport') {
    return false
  }

  return true
}
