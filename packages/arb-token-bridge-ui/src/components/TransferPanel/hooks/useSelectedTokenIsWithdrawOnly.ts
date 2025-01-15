import useSWRImmutable from 'swr/immutable'
import { useMemo } from 'react'

import { useAppState } from '../../../state'
import { useNetworks } from '../../../hooks/useNetworks'
import { useNetworksRelationship } from '../../../hooks/useNetworksRelationship'
import { isWithdrawOnlyToken } from '../../../util/WithdrawOnlyUtils'

export function useSelectedTokenIsWithdrawOnly() {
  const {
    app: { selectedToken }
  } = useAppState()
  const [networks] = useNetworks()
  const { isWithdrawalMode, parentChain, childChain } =
    useNetworksRelationship(networks)

  const queryKey = useMemo(() => {
    if (!selectedToken) {
      return null
    }
    if (isWithdrawalMode) {
      return null
    }
    return [
      selectedToken.address.toLowerCase(),
      parentChain.id,
      childChain.id
    ] as const
  }, [selectedToken, isWithdrawalMode, parentChain.id, childChain.id])

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
