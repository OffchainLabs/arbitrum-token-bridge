import { useCallback, useState } from 'react'
import { utils } from 'ethers'

import { useSetInputAmount } from '../../../hooks/TransferPanel/useSetInputAmount'
import { useNetworksRelationship } from '../../../hooks/useNetworksRelationship'
import { useNetworks } from '../../../hooks/useNetworks'
import { useAppState } from '../../../state'
import {
  Balances,
  useSelectedTokenBalances
} from '../../../hooks/TransferPanel/useSelectedTokenBalances'
import { defaultErc20Decimals } from '../../../defaults'
import { useGasSummary } from '../../../hooks/TransferPanel/useGasSummary'
import { useNativeCurrency } from '../../../hooks/useNativeCurrency'
import { useBalances } from '../../../hooks/useBalances'

export function useMaxAmount({
  customFeeTokenBalances
}: {
  customFeeTokenBalances: Balances
}) {
  const {
    app: { selectedToken }
  } = useAppState()
  const selectedTokenBalances = useSelectedTokenBalances()
  const [networks] = useNetworks()
  const { childChainProvider, isDepositMode } =
    useNetworksRelationship(networks)
  const nativeCurrency = useNativeCurrency({ provider: childChainProvider })
  const { ethParentBalance, ethChildBalance } = useBalances()
  const setAmount = useSetInputAmount()

  const [loadingMaxAmount, setLoadingMaxAmount] = useState(false)

  const { estimatedParentChainGasFees, estimatedChildChainGasFees } =
    useGasSummary()

  const setMaxAmount = useCallback(async () => {
    if (selectedToken) {
      const tokenBalance = isDepositMode
        ? selectedTokenBalances.parentBalance
        : selectedTokenBalances.childBalance

      if (tokenBalance) {
        // For token deposits and withdrawals, we can set the max amount, as gas fees are paid in ETH / custom fee token
        setAmount(
          utils.formatUnits(
            tokenBalance,
            selectedToken?.decimals ?? defaultErc20Decimals
          )
        )
      }

      return
    }

    const customFeeTokenParentBalance = customFeeTokenBalances.parentBalance
    // For custom fee token deposits, we can set the max amount, as the fees will be paid in ETH
    if (
      nativeCurrency.isCustom &&
      isDepositMode &&
      customFeeTokenParentBalance
    ) {
      setAmount(
        utils.formatUnits(customFeeTokenParentBalance, nativeCurrency.decimals)
      )
      return
    }

    // We have already handled token deposits and deposits of the custom fee token
    // The remaining cases are ETH deposits, and ETH/custom fee token withdrawals (which can be handled in the same case)
    const nativeCurrencyBalance = isDepositMode
      ? ethParentBalance
      : ethChildBalance

    if (!nativeCurrencyBalance) {
      return
    }

    setLoadingMaxAmount(true)

    const nativeCurrencyBalanceFloat = parseFloat(
      utils.formatUnits(nativeCurrencyBalance, nativeCurrency.decimals)
    )
    const estimatedTotalGasFees =
      (estimatedParentChainGasFees ?? 0) + (estimatedChildChainGasFees ?? 0)
    const maxAmount = nativeCurrencyBalanceFloat - estimatedTotalGasFees * 1.4
    // make sure it's always a positive number
    // if it's negative, set it to user's balance to show insufficient for gas error
    setAmount(String(maxAmount > 0 ? maxAmount : nativeCurrencyBalanceFloat))
    setLoadingMaxAmount(false)
  }, [
    nativeCurrency,
    ethParentBalance,
    ethChildBalance,
    isDepositMode,
    selectedToken,
    setAmount,
    selectedTokenBalances,
    estimatedParentChainGasFees,
    estimatedChildChainGasFees,
    customFeeTokenBalances
  ])

  return {
    setMaxAmount,
    loadingMaxAmount
  }
}
