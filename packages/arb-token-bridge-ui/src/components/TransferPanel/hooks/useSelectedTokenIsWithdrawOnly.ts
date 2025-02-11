import useSWRImmutable from 'swr/immutable'
import { useMemo } from 'react'

import { useNetworks } from '../../../hooks/useNetworks'
import { useNetworksRelationship } from '../../../hooks/useNetworksRelationship'
import { isWithdrawOnlyToken } from '../../../util/WithdrawOnlyUtils'
import { getTransferMode } from '../../../util/getTransferMode'
import { useSelectedToken } from '../../../hooks/useSelectedToken'

export function useSelectedTokenIsWithdrawOnly() {
  const [selectedToken] = useSelectedToken()
  const [networks] = useNetworks()
  const { parentChain, childChain } = useNetworksRelationship(networks)
  const transferMode = getTransferMode({
    sourceChainId: networks.sourceChain.id,
    destinationChainId: networks.destinationChain.id
  })

  const queryKey = useMemo(() => {
    if (!selectedToken) {
      return null
    }
    if (transferMode === 'withdrawal') {
      return null
    }
    return [
      selectedToken.address.toLowerCase(),
      parentChain.id,
      childChain.id,
      'useSelectedTokenIsWithdrawOnly'
    ] as const
  }, [selectedToken, transferMode, parentChain.id, childChain.id])

  const { data: isSelectedTokenWithdrawOnly, isLoading } = useSWRImmutable(
    queryKey,
    ([parentChainErc20Address, parentChainId, childChainId]) =>
      isWithdrawOnlyToken({
        parentChainErc20Address,
        parentChainId,
        childChainId
      })
  )

  return {
    isSelectedTokenWithdrawOnly,
    isSelectedTokenWithdrawOnlyLoading: isLoading
  }
}
