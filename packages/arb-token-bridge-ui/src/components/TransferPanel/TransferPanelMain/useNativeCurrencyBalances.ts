import { useMemo } from 'react'
import { BigNumber } from 'ethers'

import { useNativeCurrency } from '../../../hooks/useNativeCurrency'
import { useNetworks } from '../../../hooks/useNetworks'
import { useNetworksRelationship } from '../../../hooks/useNetworksRelationship'
import { useBalances } from '../../../hooks/useBalances'
import { getTransferMode } from '../../../util/getTransferMode'

export function useNativeCurrencyBalances(): {
  sourceBalance: BigNumber | null
  destinationBalance: BigNumber | null
} {
  const [networks] = useNetworks()
  const { childChainProvider } = useNetworksRelationship(networks)
  const transferMode = getTransferMode({
    sourceChainId: networks.sourceChain.id,
    destinationChainId: networks.destinationChain.id
  })
  const nativeCurrency = useNativeCurrency({ provider: childChainProvider })

  const { ethParentBalance, erc20ParentBalances, ethChildBalance } =
    useBalances()

  return useMemo(() => {
    if (!nativeCurrency.isCustom) {
      return {
        sourceBalance:
          transferMode === 'deposit' || transferMode === 'teleport'
            ? ethParentBalance
            : ethChildBalance,
        destinationBalance:
          transferMode === 'deposit' || transferMode === 'teleport'
            ? ethChildBalance
            : ethParentBalance
      }
    }

    const customFeeTokenParentBalance =
      erc20ParentBalances?.[nativeCurrency.address] ?? null
    const customFeeTokenChildBalance = ethChildBalance

    return {
      sourceBalance:
        transferMode === 'deposit' || transferMode === 'teleport'
          ? customFeeTokenParentBalance
          : customFeeTokenChildBalance,
      destinationBalance:
        transferMode === 'deposit' || transferMode === 'teleport'
          ? customFeeTokenChildBalance
          : customFeeTokenParentBalance
    }
  }, [
    nativeCurrency,
    erc20ParentBalances,
    ethChildBalance,
    transferMode,
    ethParentBalance
  ])
}
