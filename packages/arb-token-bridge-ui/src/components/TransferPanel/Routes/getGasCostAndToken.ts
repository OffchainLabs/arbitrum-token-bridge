import { constants } from 'ethers'
import { UseGasSummaryResult } from '../../../hooks/TransferPanel/useGasSummary'
import { NativeCurrency } from '../../../hooks/useNativeCurrency'
import { Token } from '../../../pages/api/crosschain-transfers/types'

export function getGasCostAndToken({
  childChainNativeCurrency,
  parentChainNativeCurrency,
  gasSummaryStatus,
  estimatedChildChainGasFees,
  estimatedParentChainGasFees,
  isDepositMode
}: {
  childChainNativeCurrency: NativeCurrency
  parentChainNativeCurrency: NativeCurrency
  gasSummaryStatus: UseGasSummaryResult['status']
  estimatedChildChainGasFees: UseGasSummaryResult['estimatedChildChainGasFees']
  estimatedParentChainGasFees: UseGasSummaryResult['estimatedParentChainGasFees']
  isDepositMode: boolean
}): {
  isLoading: boolean
  gasCost: { gasCost: number; gasToken: Token }[] | null
} {
  const sameNativeCurrency =
    childChainNativeCurrency.isCustom === parentChainNativeCurrency.isCustom
  const estimatedTotalGasFees =
    gasSummaryStatus === 'loading' ||
    typeof estimatedChildChainGasFees == 'undefined' ||
    typeof estimatedParentChainGasFees == 'undefined'
      ? undefined
      : estimatedParentChainGasFees + estimatedChildChainGasFees

  const childChainNativeCurrencyWithAddress: Token =
    'address' in childChainNativeCurrency
      ? childChainNativeCurrency
      : { ...childChainNativeCurrency, address: constants.AddressZero }

  const parentChainNativeCurrencyWithAddress: Token =
    'address' in parentChainNativeCurrency
      ? parentChainNativeCurrency
      : { ...parentChainNativeCurrency, address: constants.AddressZero }

  if (typeof estimatedTotalGasFees === 'undefined') {
    return {
      gasCost: null,
      isLoading: true
    }
  }

  /**
   * Same Native Currencies between Parent and Child chains
   * 1. ETH/ER20 deposit: L1->L2
   * 2. ETH/ERC20 withdrawal: L2->L1
   * 3. ETH/ER20 deposit: L2->L3 (ETH as gas token)
   * 4. ETH/ERC20 withdrawal: L3 (ETH as gas token)->L2
   *
   * x ETH
   */
  if (sameNativeCurrency) {
    return {
      isLoading: false,
      gasCost: [
        {
          gasCost: estimatedTotalGasFees,
          gasToken: childChainNativeCurrencyWithAddress
        }
      ]
    }
  }

  /** Different Native Currencies between Parent and Child chains
   *
   *  Custom gas token deposit: L2->Xai
   *  x ETH
   *
   *  ERC20 deposit: L2->Xai
   *  x ETH and x XAI
   *
   *  Custom gas token/ERC20 withdrawal: L3->L2
   *  only show child chain native currency
   *  x XAI
   */
  if (isDepositMode) {
    const gasCost: { gasCost: number; gasToken: Token }[] = [
      {
        gasCost: estimatedParentChainGasFees!,
        gasToken: parentChainNativeCurrencyWithAddress
      },

      // for custom-native-token deposits that use retryables we will need to add the child gas fee
      {
        gasCost: estimatedChildChainGasFees!,
        gasToken: childChainNativeCurrencyWithAddress
      }
    ]

    return {
      gasCost,
      isLoading: false
    }
  }

  return {
    isLoading: false,
    gasCost: [
      {
        gasCost: estimatedChildChainGasFees!,
        gasToken: childChainNativeCurrencyWithAddress
      }
    ]
  }
}
