import { useMemo } from 'react'
import { utils } from 'ethers'

import { useArbQueryParams } from '../../hooks/useArbQueryParams'
import { useNetworks } from '../../hooks/useNetworks'
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship'
import { useSelectedToken } from '../../hooks/useSelectedToken'
import { useAppContextState } from '../App/AppContext'
import {
  TransferReadinessRichErrorMessage,
  getInsufficientFundsErrorMessage,
  getInsufficientFundsForGasFeesErrorMessage,
  getSmartContractWalletTeleportTransfersNotSupportedErrorMessage
} from './useTransferReadinessUtils'
import { useSelectedTokenIsWithdrawOnly } from './hooks/useSelectedTokenIsWithdrawOnly'
import {
  UseGasSummaryResult,
  useGasSummary
} from '../../hooks/TransferPanel/useGasSummary'
import { useAccount } from 'wagmi'
import { useAccountType } from '../../hooks/useAccountType'
import { useNativeCurrency } from '../../hooks/useNativeCurrency'
import { useBalances } from '../../hooks/useBalances'
import { useDestinationAddressError } from './hooks/useDestinationAddressError'
import {
  isTokenArbitrumOneNativeUSDC,
  isTokenArbitrumSepoliaNativeUSDC
} from '../../util/TokenUtils'
import { isNetwork } from '../../util/networks'
import { isTransferDisabledToken } from '../../util/TokenTransferDisabledUtils'
import { isTeleportEnabledToken } from '../../util/TokenTeleportEnabledUtils'
import { ether } from '../../constants'
import { formatAmount } from '../../util/NumberUtils'

// Add chains IDs that are currently down or disabled
// It will block transfers and display an info box in the transfer panel
export const DISABLED_CHAIN_IDS: number[] = []

type ErrorMessages = {
  inputAmount1?: string | TransferReadinessRichErrorMessage
  inputAmount2?: string | TransferReadinessRichErrorMessage
}

export type UseTransferReadinessResult = {
  transferReady: boolean
  errorMessages?: ErrorMessages
}

type ReadinessResult = {
  transferReady: boolean
  errorMessage?: string | TransferReadinessRichErrorMessage
}

function ready(): UseTransferReadinessResult {
  return {
    transferReady: true
  }
}

function notReady(
  params: {
    errorMessage?: string | TransferReadinessRichErrorMessage
  } = {
    errorMessage: undefined
  }
) {
  const result: UseTransferReadinessResult = {
    transferReady: false
  }

  return { ...result, ...params }
}

function sanitizeEstimatedGasFees(
  gasSummary: UseGasSummaryResult,
  options: { isSmartContractWallet: boolean; isDepositMode: boolean }
) {
  const { estimatedParentChainGasFees, estimatedChildChainGasFees } = gasSummary

  if (
    typeof estimatedParentChainGasFees === 'undefined' ||
    typeof estimatedChildChainGasFees === 'undefined'
  ) {
    return {
      estimatedL1GasFees: 0,
      estimatedL2GasFees: 0
    }
  }

  // For smart contract wallets, the relayer pays the gas fees
  if (options.isSmartContractWallet) {
    if (options.isDepositMode) {
      // The L2 fee is paid in callvalue and needs to come from the smart contract wallet for retryable cost estimation to succeed
      return {
        estimatedL1GasFees: 0,
        estimatedL2GasFees: estimatedChildChainGasFees
      }
    }

    return {
      estimatedL1GasFees: 0,
      estimatedL2GasFees: 0
    }
  }

  return {
    estimatedL1GasFees: estimatedParentChainGasFees,
    estimatedL2GasFees: estimatedChildChainGasFees
  }
}

function withdrawalDisabled(token: string) {
  return [
    '0x0e192d382a36de7011f795acc4391cd302003606',
    '0x488cc08935458403a0458e45e20c0159c8ab2c92'
  ].includes(token.toLowerCase())
}

export const useTransferReadiness = (): UseTransferReadinessResult => {
  const [{ amount, amount2 }] = useArbQueryParams()
  const [selectedToken] = useSelectedToken()
  const {
    layout: { isTransferring }
  } = useAppContextState()
  const [networks] = useNetworks()
  const {
    childChain,
    childChainProvider,
    parentChain,
    isDepositMode,
    isTeleportMode
  } = useNetworksRelationship(networks)

  const { isSelectedTokenWithdrawOnly, isSelectedTokenWithdrawOnlyLoading } =
    useSelectedTokenIsWithdrawOnly()
  const gasSummary = useGasSummary()
  const { address: walletAddress } = useAccount()
  const { isSmartContractWallet } = useAccountType()
  const nativeCurrency = useNativeCurrency({ provider: childChainProvider })

  const {
    ethParentBalance,
    erc20ParentBalances,
    ethChildBalance,
    erc20ChildBalances
  } = useBalances({
    parentWalletAddress: walletAddress,
    childWalletAddress: walletAddress
  })
  const { destinationAddressError } = useDestinationAddressError()

  const ethL1BalanceFloat = ethParentBalance
    ? parseFloat(utils.formatEther(ethParentBalance))
    : null

  const ethL2BalanceFloat = ethChildBalance
    ? parseFloat(utils.formatEther(ethChildBalance))
    : null

  const selectedTokenL1BalanceFloat = useMemo(() => {
    if (!selectedToken) {
      return null
    }

    const balance = erc20ParentBalances?.[selectedToken.address.toLowerCase()]

    if (!balance) {
      return null
    }

    return parseFloat(utils.formatUnits(balance, selectedToken.decimals))
  }, [selectedToken, erc20ParentBalances])

  const selectedTokenL2BalanceFloat = useMemo(() => {
    if (!selectedToken) {
      return null
    }

    const { isOrbitChain } = isNetwork(childChain.id)

    const isL2NativeUSDC =
      isTokenArbitrumOneNativeUSDC(selectedToken.address) ||
      isTokenArbitrumSepoliaNativeUSDC(selectedToken.address)

    const selectedTokenL2Address =
      isL2NativeUSDC && !isOrbitChain
        ? selectedToken.address.toLowerCase()
        : (selectedToken.l2Address || '').toLowerCase()

    const balance = erc20ChildBalances?.[selectedTokenL2Address]

    if (!balance) {
      return null
    }

    return parseFloat(utils.formatUnits(balance, selectedToken.decimals))
  }, [selectedToken, childChain.id, erc20ChildBalances])

  const customFeeTokenL1BalanceFloat = useMemo(() => {
    if (!nativeCurrency.isCustom) {
      return null
    }

    const balance = erc20ParentBalances?.[nativeCurrency.address]

    if (!balance) {
      return null
    }

    return parseFloat(utils.formatUnits(balance, nativeCurrency.decimals))
  }, [nativeCurrency, erc20ParentBalances])

  const ethBalanceFloat = isDepositMode ? ethL1BalanceFloat : ethL2BalanceFloat
  const selectedTokenBalanceFloat = isDepositMode
    ? selectedTokenL1BalanceFloat
    : selectedTokenL2BalanceFloat
  const customFeeTokenBalanceFloat = isDepositMode
    ? customFeeTokenL1BalanceFloat
    : ethL2BalanceFloat

  const { estimatedL1GasFees, estimatedL2GasFees } = sanitizeEstimatedGasFees(
    gasSummary,
    {
      isSmartContractWallet,
      isDepositMode
    }
  )

  const amountReady: ReadinessResult = useMemo(() => {
    if (selectedTokenBalanceFloat === null || ethBalanceFloat === null) {
      return notReady()
    }

    // teleport transfers using SC wallets not enabled yet
    if (isSmartContractWallet && isTeleportMode) {
      return notReady({
        errorMessage:
          getSmartContractWalletTeleportTransfersNotSupportedErrorMessage()
      })
    }

    if (selectedToken) {
      const selectedTokenIsDisabled =
        isTransferDisabledToken(selectedToken.address, childChain.id) ||
        (isTeleportMode &&
          !isTeleportEnabledToken(
            selectedToken.address,
            parentChain.id,
            childChain.id
          ))

      if (
        isDepositMode &&
        isSelectedTokenWithdrawOnly &&
        !isSelectedTokenWithdrawOnlyLoading
      ) {
        return notReady({
          errorMessage: TransferReadinessRichErrorMessage.TOKEN_WITHDRAW_ONLY
        })
      } else if (selectedTokenIsDisabled) {
        return notReady({
          errorMessage:
            TransferReadinessRichErrorMessage.TOKEN_TRANSFER_DISABLED
        })
      }

      if (Number(amount) > selectedTokenBalanceFloat) {
        return notReady({
          errorMessage: getInsufficientFundsErrorMessage({
            asset: selectedToken.symbol,
            chain: networks.sourceChain.name
          })
        })
      }
    } else if (nativeCurrency.isCustom) {
      if (customFeeTokenBalanceFloat === null) {
        return notReady()
      }

      if (Number(amount) > customFeeTokenBalanceFloat) {
        return notReady({
          errorMessage: getInsufficientFundsErrorMessage({
            asset: nativeCurrency.symbol,
            chain: networks.sourceChain.name
          })
        })
      }
    } else if (Number(amount) > ethBalanceFloat) {
      return notReady({
        errorMessage: getInsufficientFundsErrorMessage({
          asset: ether.symbol,
          chain: networks.sourceChain.name
        })
      })
    }

    return ready()
  }, [
    amount,
    childChain.id,
    customFeeTokenBalanceFloat,
    ethBalanceFloat,
    isDepositMode,
    isSelectedTokenWithdrawOnly,
    isSelectedTokenWithdrawOnlyLoading,
    isSmartContractWallet,
    isTeleportMode,
    nativeCurrency.isCustom,
    nativeCurrency.symbol,
    networks.sourceChain.name,
    parentChain.id,
    selectedToken,
    selectedTokenBalanceFloat
  ])

  const amount2Ready: ReadinessResult = useMemo(() => {
    const amount2Number = Number(amount2)

    if (ethBalanceFloat === null) {
      return notReady()
    }

    if (isNaN(amount2Number) || amount2Number === 0) {
      return ready()
    }

    if (nativeCurrency.isCustom) {
      // not enough native currency
      if (amount2Number > Number(customFeeTokenL1BalanceFloat)) {
        return notReady({
          errorMessage: getInsufficientFundsErrorMessage({
            asset: nativeCurrency.symbol,
            chain: networks.sourceChain.name
          })
        })
      }
    } else {
      if (
        amount2Number >
        ethBalanceFloat - (estimatedL1GasFees + estimatedL2GasFees)
      ) {
        return notReady({
          errorMessage: getInsufficientFundsErrorMessage({
            asset: nativeCurrency.symbol,
            chain: networks.sourceChain.name
          })
        })
      }
    }
    return ready()
  }, [
    amount2,
    customFeeTokenL1BalanceFloat,
    estimatedL1GasFees,
    estimatedL2GasFees,
    ethBalanceFloat,
    nativeCurrency.isCustom,
    nativeCurrency.symbol,
    networks.sourceChain.name
  ])

  const gasReady: ReadinessResult = useMemo(() => {
    if (ethBalanceFloat === null || customFeeTokenL1BalanceFloat === null) {
      return notReady()
    }

    switch (gasSummary.status) {
      case 'loading':
        return notReady()

      case 'unavailable':
        return ready()

      case 'error':
        return notReady({
          errorMessage: TransferReadinessRichErrorMessage.GAS_ESTIMATION_FAILURE
        })

      case 'insufficientBalance':
        return notReady()

      case 'success': {
        if (selectedToken) {
          // If depositing into a custom fee token network, gas is split between ETH and the custom fee token
          if (nativeCurrency.isCustom && isDepositMode) {
            // not enough ETH to cover L1 gas
            if (estimatedL1GasFees > ethBalanceFloat) {
              return notReady({
                errorMessage: getInsufficientFundsForGasFeesErrorMessage({
                  asset: ether.symbol,
                  chain: networks.sourceChain.name,
                  balance: formatAmount(ethBalanceFloat),
                  requiredBalance: formatAmount(estimatedL1GasFees)
                })
              })
            }

            if (estimatedL2GasFees > customFeeTokenL1BalanceFloat) {
              return notReady({
                errorMessage: getInsufficientFundsForGasFeesErrorMessage({
                  asset: nativeCurrency.symbol,
                  chain: networks.sourceChain.name,
                  balance: formatAmount(customFeeTokenL1BalanceFloat),
                  requiredBalance: formatAmount(estimatedL2GasFees)
                })
              })
            }

            return ready()
          }

          // Everything is paid in ETH, so we sum it up
          if (estimatedL1GasFees + estimatedL2GasFees > ethBalanceFloat) {
            return notReady({
              errorMessage: getInsufficientFundsForGasFeesErrorMessage({
                asset: ether.symbol,
                chain: networks.sourceChain.name,
                balance: formatAmount(ethBalanceFloat),
                requiredBalance: formatAmount(
                  estimatedL1GasFees + estimatedL2GasFees
                )
              })
            })
          }

          return ready()
        }

        if (nativeCurrency.isCustom && isDepositMode) {
          // Deposits of the custom fee token will be paid in ETH, so we have to check if there's enough ETH to cover L1 gas
          // Withdrawals of the custom fee token will be treated same as ETH withdrawals (in the case below)
          if (estimatedL1GasFees + estimatedL2GasFees > ethBalanceFloat) {
            return notReady({
              errorMessage: getInsufficientFundsForGasFeesErrorMessage({
                asset: ether.symbol,
                chain: networks.sourceChain.name,
                balance: formatAmount(ethBalanceFloat),
                requiredBalance: formatAmount(
                  estimatedL1GasFees + estimatedL2GasFees
                )
              })
            })
          }

          return ready()
        }

        // Everything is in the same currency
        // This case also handles custom fee token withdrawals, as `ethBalanceFloat` will reflect the custom fee token balance on the Orbit chain
        const total = Number(amount) + estimatedL1GasFees + estimatedL2GasFees

        if (total > ethBalanceFloat) {
          return notReady({
            errorMessage: getInsufficientFundsForGasFeesErrorMessage({
              asset: nativeCurrency.symbol,
              chain: networks.sourceChain.name,
              balance: formatAmount(ethBalanceFloat),
              requiredBalance: formatAmount(total)
            })
          })
        }

        return ready()
      }

      default:
        return notReady()
    }
  }, [
    amount,
    customFeeTokenL1BalanceFloat,
    estimatedL1GasFees,
    estimatedL2GasFees,
    ethBalanceFloat,
    gasSummary.status,
    isDepositMode,
    nativeCurrency.isCustom,
    nativeCurrency.symbol,
    networks.sourceChain.name,
    selectedToken
  ])

  return useMemo(() => {
    // No error while loading balance
    if (ethBalanceFloat === null) {
      return notReady()
    }

    if (isTransferring) {
      return notReady()
    }

    if (DISABLED_CHAIN_IDS.includes(childChain.id)) {
      return notReady()
    }

    if (destinationAddressError) {
      return notReady()
    }

    if (selectedToken && withdrawalDisabled(selectedToken.address)) {
      return notReady()
    }

    if (selectedTokenBalanceFloat === null) {
      return notReady()
    }

    return {
      transferReady:
        amountReady.transferReady &&
        amount2Ready.transferReady &&
        gasReady.transferReady,
      errorMessages:
        amountReady.errorMessage ||
        amount2Ready.errorMessage ||
        gasReady.errorMessage
          ? {
              inputAmount1: gasReady.errorMessage ?? amountReady.errorMessage,
              inputAmount2: amount2Ready.errorMessage
            }
          : undefined
    }
  }, [
    ethBalanceFloat,
    isTransferring,
    childChain.id,
    destinationAddressError,
    selectedToken,
    selectedTokenBalanceFloat,
    amountReady,
    amount2Ready,
    gasReady
  ])
}
