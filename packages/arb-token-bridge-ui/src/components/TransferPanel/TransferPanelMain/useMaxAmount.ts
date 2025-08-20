import { useMemo } from 'react'
import { utils } from 'ethers'

import { useNetworksRelationship } from '../../../hooks/useNetworksRelationship'
import { useNetworks } from '../../../hooks/useNetworks'
import { useSelectedTokenBalances } from '../../../hooks/TransferPanel/useSelectedTokenBalances'
import { defaultErc20Decimals } from '../../../defaults'
import { useGasSummary } from '../../../hooks/TransferPanel/useGasSummary'
import { useNativeCurrency } from '../../../hooks/useNativeCurrency'
import { useNativeCurrencyBalances } from './useNativeCurrencyBalances'
import { useSelectedToken } from '../../../hooks/useSelectedToken'
import { useSourceChainNativeCurrencyDecimals } from '../../../hooks/useSourceChainNativeCurrencyDecimals'

export function useMaxAmount() {
  const [selectedToken] = useSelectedToken()
  const selectedTokenBalances = useSelectedTokenBalances()
  const [networks] = useNetworks()
  const { childChainProvider, isDepositMode } =
    useNetworksRelationship(networks)
  const nativeCurrency = useNativeCurrency({ provider: childChainProvider })
  const nativeCurrencyDecimalsOnSourceChain =
    useSourceChainNativeCurrencyDecimals()

  const { estimatedParentChainGasFees, estimatedChildChainGasFees } =
    useGasSummary()

  const nativeCurrencyBalances = useNativeCurrencyBalances()

  const nativeCurrencyMaxAmount = useMemo(() => {
    const nativeCurrencySourceBalance = nativeCurrencyBalances.sourceBalance

    if (!nativeCurrencySourceBalance) {
      return undefined
    }

    // ETH deposits and ETH/custom fee token withdrawals
    const nativeCurrencyBalanceFormatted = utils.formatUnits(
      nativeCurrencySourceBalance,
      nativeCurrencyDecimalsOnSourceChain
    )

    if (nativeCurrency.isCustom && isDepositMode) {
      // for custom fee native token deposits, we will need to subtract the child gas fee from source-balance
      return String(
        parseFloat(nativeCurrencyBalanceFormatted) -
          (estimatedChildChainGasFees ?? 0) * 1.4
      )
    }

    if (
      typeof estimatedParentChainGasFees === 'undefined' ||
      typeof estimatedChildChainGasFees === 'undefined'
    ) {
      return undefined
    }

    const estimatedTotalGasFees =
      estimatedParentChainGasFees + estimatedChildChainGasFees

    const maxAmount =
      parseFloat(nativeCurrencyBalanceFormatted) - estimatedTotalGasFees * 1.4

    // make sure it's always a positive number
    // if it's negative, set it to user's balance to show insufficient for gas error
    if (maxAmount > 0) {
      return String(maxAmount)
    }

    return nativeCurrencyBalanceFormatted
  }, [
    estimatedChildChainGasFees,
    estimatedParentChainGasFees,
    isDepositMode,
    nativeCurrency.isCustom,
    nativeCurrencyBalances.sourceBalance,
    nativeCurrencyDecimalsOnSourceChain
  ])

  const maxAmount = useMemo(() => {
    if (selectedToken) {
      const tokenBalance = selectedTokenBalances.sourceBalance

      if (!tokenBalance) {
        return undefined
      }

      // For token deposits and withdrawals, we can set the max amount, as gas fees are paid in ETH / custom fee token
      return utils.formatUnits(
        tokenBalance,
        selectedToken?.decimals ?? defaultErc20Decimals
      )
    }

    return nativeCurrencyMaxAmount
  }, [
    selectedToken,
    nativeCurrencyMaxAmount,
    selectedTokenBalances.sourceBalance
  ])

  const maxAmount2 = useMemo(() => {
    if (!isDepositMode) {
      return undefined
    }
    if (typeof estimatedChildChainGasFees === 'undefined') {
      return undefined
    }
    if (typeof nativeCurrencyMaxAmount === 'undefined') {
      return undefined
    }

    if (nativeCurrency.isCustom) {
      const amount =
        Number(nativeCurrencyMaxAmount) - estimatedChildChainGasFees * 1.4

      // make sure it's always a positive number
      // if it's negative, set it to user's balance to show insufficient for gas error
      if (amount > 0) {
        return String(amount)
      }
    }

    return nativeCurrencyMaxAmount
  }, [
    isDepositMode,
    estimatedChildChainGasFees,
    nativeCurrencyMaxAmount,
    nativeCurrency.isCustom
  ])

  return {
    maxAmount,
    maxAmount2
  }
}
