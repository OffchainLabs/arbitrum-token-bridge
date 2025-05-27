import { useMemo } from 'react'
import { BigNumber, constants } from 'ethers'
import { useAccount } from 'wagmi'

import { useNativeCurrency } from '../../../hooks/useNativeCurrency'
import { useNetworks } from '../../../hooks/useNetworks'
import { useNetworksRelationship } from '../../../hooks/useNetworksRelationship'
import { useBalances } from '../../../hooks/useBalances'
import { useArbQueryParams } from '../../../hooks/useArbQueryParams'

export function useNativeCurrencyBalances(): {
  sourceBalance: BigNumber | null
  destinationBalance: BigNumber | null
} {
  const [networks] = useNetworks()
  const { childChainProvider, isDepositMode } =
    useNetworksRelationship(networks)
  const [{ destinationAddress }] = useArbQueryParams()
  const { isConnected } = useAccount()
  const nativeCurrency = useNativeCurrency({ provider: childChainProvider })

  const { ethParentBalance, erc20ParentBalances, ethChildBalance } =
    useBalances()

  const customFeeTokenParentBalance =
    'address' in nativeCurrency
      ? (erc20ParentBalances?.[nativeCurrency.address] ?? null)
      : null
  const customFeeTokenChildBalance = ethChildBalance

  const destinationBalance = useMemo(() => {
    if (!isConnected && !destinationAddress) {
      return constants.Zero
    }

    if (!nativeCurrency.isCustom) {
      return isDepositMode ? ethChildBalance : ethParentBalance
    }

    return isDepositMode
      ? customFeeTokenChildBalance
      : customFeeTokenParentBalance
  }, [
    customFeeTokenChildBalance,
    customFeeTokenParentBalance,
    destinationAddress,
    ethChildBalance,
    ethParentBalance,
    isConnected,
    isDepositMode,
    nativeCurrency.isCustom
  ])

  return useMemo(() => {
    if (!isConnected) {
      return {
        sourceBalance: constants.Zero,
        destinationBalance
      }
    }

    if (!nativeCurrency.isCustom) {
      return {
        sourceBalance: isDepositMode ? ethParentBalance : ethChildBalance,
        destinationBalance
      }
    }

    return {
      sourceBalance: isDepositMode
        ? customFeeTokenParentBalance
        : customFeeTokenChildBalance,
      destinationBalance
    }
  }, [
    isConnected,
    nativeCurrency.isCustom,
    isDepositMode,
    customFeeTokenParentBalance,
    customFeeTokenChildBalance,
    destinationBalance,
    ethParentBalance,
    ethChildBalance
  ])
}
