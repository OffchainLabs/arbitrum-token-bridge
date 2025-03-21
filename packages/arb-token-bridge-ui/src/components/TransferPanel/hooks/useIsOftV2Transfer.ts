import useSWRImmutable from 'swr/immutable'

import { useNetworks } from '../../../hooks/useNetworks'
import { getOftV2TransferConfig } from '../../../token-bridge-sdk/oftUtils'
import { useSelectedToken } from '../../../hooks/useSelectedToken'
import { getTransferMode } from '../../../util/getTransferMode'

export const useIsOftV2Transfer = function () {
  const [selectedToken] = useSelectedToken()
  const [{ sourceChain, destinationChain }] = useNetworks()
  const transferMode = getTransferMode({
    sourceChainId: sourceChain.id,
    destinationChainId: destinationChain.id
  })

  const { data: isOft = false } = useSWRImmutable(
    // Only create cache key if we have all required params
    selectedToken && transferMode !== 'teleport'
      ? [
          transferMode === 'deposit'
            ? selectedToken.address
            : selectedToken.l2Address,
          sourceChain.id,
          destinationChain.id,
          'oft-transfer'
        ]
      : null,
    async ([_sourceChainErc20Address, _sourceChainId, _destinationChainId]) =>
      getOftV2TransferConfig({
        sourceChainId: _sourceChainId,
        destinationChainId: _destinationChainId,
        sourceChainErc20Address: _sourceChainErc20Address
      }).isValid
  )

  return isOft
}
