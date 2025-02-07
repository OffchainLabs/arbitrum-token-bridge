import { getTransferMode } from '../../util/getTransferMode'
import { isTokenNativeUSDC } from '../../util/TokenUtils'
import { useNetworks } from '../useNetworks'
import { useSelectedToken } from '../useSelectedToken'
import { useIsOftV2Transfer } from '../../components/TransferPanel/hooks/useIsOftV2Transfer'

export const useIsBatchTransferSupported = () => {
  const [{ sourceChain, destinationChain }] = useNetworks()
  const transferMode = getTransferMode({
    sourceChainId: sourceChain.id,
    destinationChainId: destinationChain.id
  })
  const [selectedToken] = useSelectedToken()
  const isOftTransfer = useIsOftV2Transfer()

  if (!selectedToken) {
    return false
  }
  if (transferMode === 'unsupported') {
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

  if (isOftTransfer) {
    return false
  }

  return true
}
