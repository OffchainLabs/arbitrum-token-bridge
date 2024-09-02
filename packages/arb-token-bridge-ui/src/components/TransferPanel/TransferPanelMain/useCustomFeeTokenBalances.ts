import { useMemo } from 'react'

import { Balances } from '../../../hooks/TransferPanel/useSelectedTokenBalances'
import { useNativeCurrency } from '../../../hooks/useNativeCurrency'
import { useNetworks } from '../../../hooks/useNetworks'
import { useNetworksRelationship } from '../../../hooks/useNetworksRelationship'
import { useBalances } from '../../../hooks/useBalances'

export function useCustomFeeTokenBalances(): Balances {
  const [networks] = useNetworks()
  const { childChainProvider } = useNetworksRelationship(networks)
  const nativeCurrency = useNativeCurrency({ provider: childChainProvider })

  const { ethParentBalance, erc20ParentBalances, ethChildBalance } =
    useBalances()

  return useMemo(() => {
    if (!nativeCurrency.isCustom) {
      return { parentBalance: ethParentBalance, childBalance: ethChildBalance }
    }

    return {
      parentBalance: erc20ParentBalances?.[nativeCurrency.address] ?? null,
      childBalance: ethChildBalance
    }
  }, [nativeCurrency, ethParentBalance, ethChildBalance, erc20ParentBalances])
}
