import { useMemo } from 'react'
import { useAccount } from 'wagmi'
import { useLocalStorage } from '@uidotdev/usehooks'
import { BigNumber, constants, utils } from 'ethers'

import { useAccountType } from '../../hooks/useAccountType'
import { useNativeCurrency } from '../../hooks/useNativeCurrency'
import {
  isTokenArbitrumSepoliaNativeUSDC,
  isTokenArbitrumOneNativeUSDC
} from '../../util/TokenUtils'
import { useAppContextState } from '../App/AppContext'
import {
  TransferReadinessRichErrorMessage,
  getInsufficientFundsErrorMessage,
  getInsufficientFundsForGasFeesErrorMessage,
  getSmartContractWalletTeleportTransfersNotSupportedErrorMessage,
  getWithdrawOnlyChainErrorMessage
} from './useTransferReadinessUtils'
import { ether, TOS_LOCALSTORAGE_KEY } from '../../constants'
import {
  UseGasSummaryResult,
  useGasSummary
} from '../../hooks/TransferPanel/useGasSummary'
import { isTransferDisabledToken } from '../../util/TokenTransferDisabledUtils'
import { useNetworks } from '../../hooks/useNetworks'
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship'
import { isTeleportEnabledToken } from '../../util/TokenTeleportEnabledUtils'
import { isNetwork } from '../../util/networks'
import { useSelectedToken } from '../../hooks/useSelectedToken'
import { useBalances } from '../../hooks/useBalances'
import { useArbQueryParams } from '../../hooks/useArbQueryParams'
import { formatAmount } from '../../util/NumberUtils'
import { useSelectedTokenIsWithdrawOnly } from './hooks/useSelectedTokenIsWithdrawOnly'
import { useDestinationAddressError } from './hooks/useDestinationAddressError'
import {
  isLifiRoute,
  RouteContext,
  RouteType,
  useRouteStore
} from './hooks/useRouteStore'
import { shallow } from 'zustand/shallow'
import { isLifiEnabled } from '../../util/featureFlag'
import { isValidLifiTransfer } from '../../app/api/crosschain-transfers/utils'
import { Token } from '../../app/api/crosschain-transfers/types'

// Add chains IDs that are currently down or disabled
// It will block transfers (both deposits and withdrawals) and display an info box in the transfer panel
export const DISABLED_CHAIN_IDS: number[] = []

// withdraw-only chains (will also display error message in the transfer panel)
const WITHDRAW_ONLY_CHAIN_IDS: number[] = [98865, 70700, 70701, 140] // Plume Legacy, PoP Apex, PoP Boss, Data Lake Mainnet

type ErrorMessages = {
  inputAmount1?: string | TransferReadinessRichErrorMessage
  inputAmount2?: string | TransferReadinessRichErrorMessage
}

function sanitizeEstimatedGasFees(
  gasSummary: UseGasSummaryResult,
  options: {
    isSmartContractWallet: boolean
    isDepositMode: boolean
    selectedRoute: RouteType | undefined
  }
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
    // For CCTP, the relayer pays for everything
    if (options.selectedRoute === 'cctp') {
      return { estimatedL1GasFees: 0, estimatedL2GasFees: 0 }
    }

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
    '0x488cc08935458403a0458e45e20c0159c8ab2c92',
    '0x17FC002b466eEc40DaE837Fc4bE5c67993ddBd6F',
    '0x7468a5d8E02245B00E8C0217fCE021C70Bc51305'
  ].includes(token.toLowerCase())
}

function ready() {
  const result: UseTransferReadinessResult = {
    transferReady: { deposit: true, withdrawal: true }
  }

  return result
}

function notReady(
  params: {
    errorMessages: ErrorMessages | undefined
  } = {
    errorMessages: undefined
  }
) {
  const result: UseTransferReadinessResult = {
    transferReady: { deposit: false, withdrawal: false }
  }

  return { ...result, ...params }
}

/**
 * For some transfers (from Ape for example), fees and gas are paid in APE token.
 * While amount itself is paid in the token sent (USDC or ETH).
 */
export type AmountsToPay = {
  amount: BigNumber
  amountUSD: string
  token: Token
}
export type GetAmountToPayResult = {
  amounts: Record<string, AmountsToPay>
  fromAmountUsd: number
  toAmountUsd: number
}
export function getAmountToPay(
  selectedRouteContext: RouteContext
): GetAmountToPayResult {
  const amounts: Record<string, AmountsToPay> = {}

  function addAmount({
    token,
    amount,
    amountUSD
  }: {
    token: Token
    amount: BigNumber
    amountUSD: string
  }) {
    const key = token.address.toLowerCase()
    const acc = amounts[key]
    if (acc) {
      amounts[key] = {
        amount: acc.amount.add(amount),
        amountUSD: (Number(acc.amountUSD) + Number(amountUSD)).toFixed(3),
        token
      }
    } else {
      amounts[key] = {
        amount,
        amountUSD,
        token
      }
    }
  }

  addAmount(selectedRouteContext.fee)
  addAmount(selectedRouteContext.gas)
  addAmount(selectedRouteContext.fromAmount)

  const fromAmountUsd =
    Number(selectedRouteContext.fromAmount.amountUSD) +
    Number(selectedRouteContext.gas.amountUSD) +
    Number(selectedRouteContext.fee.amountUSD)

  return {
    amounts,
    fromAmountUsd: Number(fromAmountUsd.toFixed(3)),
    toAmountUsd: Number(selectedRouteContext.toAmount.amountUSD)
  }
}

export type UseTransferReadinessTransferReady = {
  deposit: boolean
  withdrawal: boolean
}

export type UseTransferReadinessResult = {
  transferReady: UseTransferReadinessTransferReady
  errorMessages?: ErrorMessages
}

export function useTransferReadiness(): UseTransferReadinessResult {
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
  const { selectedRoute, selectedRouteContext } = useRouteStore(
    state => ({
      selectedRoute: state.selectedRoute,
      selectedRouteContext: state.context
    }),
    shallow
  )

  const { isSelectedTokenWithdrawOnly, isSelectedTokenWithdrawOnlyLoading } =
    useSelectedTokenIsWithdrawOnly()
  const gasSummary = useGasSummary()
  const { address: walletAddress } = useAccount()
  const { accountType } = useAccountType()
  const isSmartContractWallet = accountType === 'smart-contract-wallet'
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
  const [tosAccepted] = useLocalStorage<boolean>(TOS_LOCALSTORAGE_KEY)

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

  return useMemo(() => {
    const { estimatedL1GasFees, estimatedL2GasFees } = sanitizeEstimatedGasFees(
      gasSummary,
      {
        selectedRoute,
        isSmartContractWallet,
        isDepositMode
      }
    )

    if (!selectedRoute) {
      return notReady()
    }

    const ethBalanceFloat = isDepositMode
      ? ethL1BalanceFloat
      : ethL2BalanceFloat
    const selectedTokenBalanceFloat = isDepositMode
      ? selectedTokenL1BalanceFloat
      : selectedTokenL2BalanceFloat
    const customFeeTokenBalanceFloat = isDepositMode
      ? customFeeTokenL1BalanceFloat
      : ethL2BalanceFloat

    // No error while loading balance
    if (ethBalanceFloat === null) {
      return notReady()
    }

    const sendsAmount2 = Number(amount2) > 0
    const notEnoughAmount2 = nativeCurrency.isCustom
      ? Number(amount2) > Number(customFeeTokenL1BalanceFloat)
      : Number(amount2) >
        ethBalanceFloat - (estimatedL1GasFees + estimatedL2GasFees)

    if (isNaN(Number(amount)) || Number(amount) === 0) {
      return notReady({
        errorMessages: {
          inputAmount2:
            sendsAmount2 && notEnoughAmount2
              ? getInsufficientFundsErrorMessage({
                  asset: nativeCurrency.symbol,
                  chain: networks.sourceChain.name
                })
              : undefined
        }
      })
    }

    if (isTransferring) {
      return notReady()
    }

    if (DISABLED_CHAIN_IDS.includes(childChain.id)) {
      return notReady()
    }

    if (isDepositMode && WITHDRAW_ONLY_CHAIN_IDS.includes(childChain.id)) {
      return notReady({
        errorMessages: {
          inputAmount1: getWithdrawOnlyChainErrorMessage(childChain.name)
        }
      })
    }

    // teleport transfers using SC wallets not enabled yet
    if (isSmartContractWallet && isTeleportMode) {
      return notReady({
        errorMessages: {
          inputAmount1:
            getSmartContractWalletTeleportTransfersNotSupportedErrorMessage()
        }
      })
    }

    // Check if destination address is valid for ERC20 transfers
    if (destinationAddressError) {
      return notReady()
    }

    // ERC-20
    if (selectedToken) {
      const selectedTokenIsDisabled =
        isTransferDisabledToken(selectedToken.address, childChain.id) ||
        (isTeleportMode &&
          !isTeleportEnabledToken(
            selectedToken.address,
            parentChain.id,
            childChain.id
          ))
      const isValidLifiRoute =
        isLifiEnabled() &&
        isValidLifiTransfer({
          sourceChainId: networks.sourceChain.id,
          fromToken: isDepositMode
            ? selectedToken.address
            : selectedToken.l2Address,
          destinationChainId: networks.destinationChain.id
        })

      if (
        isDepositMode &&
        isSelectedTokenWithdrawOnly &&
        !isSelectedTokenWithdrawOnlyLoading
      ) {
        return notReady({
          errorMessages: {
            inputAmount1: TransferReadinessRichErrorMessage.TOKEN_WITHDRAW_ONLY
          }
        })
      } else if (selectedTokenIsDisabled && !isValidLifiRoute) {
        return notReady({
          errorMessages: {
            inputAmount1:
              TransferReadinessRichErrorMessage.TOKEN_TRANSFER_DISABLED
          }
        })
      } else if (withdrawalDisabled(selectedToken.address)) {
        return notReady()
      }

      // No error while loading balance
      if (selectedTokenBalanceFloat === null) {
        return notReady()
      }

      // Check amount against ERC-20 balance
      if (Number(amount) > selectedTokenBalanceFloat) {
        return notReady({
          errorMessages: {
            inputAmount1: getInsufficientFundsErrorMessage({
              asset: selectedToken.symbol,
              chain: networks.sourceChain.name
            }),
            inputAmount2:
              sendsAmount2 && notEnoughAmount2
                ? getInsufficientFundsErrorMessage({
                    asset: nativeCurrency.symbol,
                    chain: networks.sourceChain.name
                  })
                : undefined
          }
        })
      }
    }
    // Custom fee token
    else if (nativeCurrency.isCustom) {
      // No error while loading balance
      if (customFeeTokenBalanceFloat === null) {
        return notReady()
      }

      // Check amount against custom fee token balance
      if (
        Number(amount) > customFeeTokenBalanceFloat ||
        (sendsAmount2 && notEnoughAmount2)
      ) {
        return notReady({
          errorMessages: {
            inputAmount1:
              Number(amount) > customFeeTokenBalanceFloat
                ? getInsufficientFundsErrorMessage({
                    asset: nativeCurrency.symbol,
                    chain: networks.sourceChain.name
                  })
                : undefined,
            inputAmount2:
              sendsAmount2 && notEnoughAmount2
                ? getInsufficientFundsErrorMessage({
                    asset: nativeCurrency.symbol,
                    chain: networks.sourceChain.name
                  })
                : undefined
          }
        })
      }
    }
    // ETH
    // Check amount against ETH balance
    else if (Number(amount) > ethBalanceFloat) {
      return notReady({
        errorMessages: {
          inputAmount1: getInsufficientFundsErrorMessage({
            asset: ether.symbol,
            chain: networks.sourceChain.name
          })
        }
      })
    }

    /**
     * Lifi: Prevent bridging if the total of bridge fee, gas fee and amount are greater than the user's balance
     * This check needs to be after ERC20 check.
     * In case of insufficient balance we want to show insufficient balance error message, not gas error
     */
    if (isLifiRoute(selectedRoute)) {
      if (!selectedRouteContext) {
        return notReady()
      }

      const { amounts } = getAmountToPay(selectedRouteContext)

      // Check if we have enough native balance to cover gas, fees and potentially token sent
      const feeToSend = amounts[constants.AddressZero]
      const feeToPay = parseFloat(
        utils.formatUnits(
          feeToSend?.amount || constants.Zero,
          feeToSend?.token.decimals || 18
        )
      )

      if (feeToPay > ethBalanceFloat) {
        return notReady({
          errorMessages: {
            inputAmount1: getInsufficientFundsForGasFeesErrorMessage({
              asset: nativeCurrency.symbol,
              chain: networks.sourceChain.name,
              balance: formatAmount(ethBalanceFloat),
              requiredBalance: formatAmount(feeToPay)
            })
          }
        })
      }

      // Check token sent balance
      const amountToSend = selectedToken?.address
        ? amounts[
            (isDepositMode
              ? selectedToken?.address
              : selectedToken?.l2Address) || constants.AddressZero
          ]
        : undefined
      const amountToPay = parseFloat(
        utils.formatUnits(
          amountToSend?.amount || constants.Zero,
          amountToSend?.token.decimals || 18
        )
      )

      if (
        selectedTokenBalanceFloat &&
        amountToPay > selectedTokenBalanceFloat
      ) {
        return notReady({
          errorMessages: {
            inputAmount1: getInsufficientFundsErrorMessage({
              asset: selectedToken?.symbol || nativeCurrency.symbol,
              chain: networks.sourceChain.name
            })
          }
        })
      }
    }

    if (!tosAccepted) {
      return notReady()
    }

    // The amount entered is enough funds, but now let's include gas costs
    switch (gasSummary.status) {
      // No error while loading gas costs
      case 'loading':
        return notReady()

      case 'unavailable':
        return ready()

      case 'error':
        return notReady({
          errorMessages: {
            inputAmount1:
              TransferReadinessRichErrorMessage.GAS_ESTIMATION_FAILURE
          }
        })

      case 'insufficientBalance':
        return notReady()

      case 'success': {
        if (selectedToken) {
          // If depositing into a custom fee token network, gas is split between ETH and the custom fee token
          if (nativeCurrency.isCustom && isDepositMode) {
            // Still loading custom fee token balance
            if (customFeeTokenL1BalanceFloat === null) {
              return notReady()
            }

            // We have to check if there's enough ETH to cover L1 gas
            if (
              estimatedL1GasFees > ethBalanceFloat ||
              (sendsAmount2 && notEnoughAmount2)
            ) {
              return notReady({
                errorMessages: {
                  inputAmount1:
                    estimatedL1GasFees > ethBalanceFloat
                      ? getInsufficientFundsForGasFeesErrorMessage({
                          asset: ether.symbol,
                          chain: networks.sourceChain.name,
                          balance: formatAmount(ethBalanceFloat),
                          requiredBalance: formatAmount(estimatedL1GasFees)
                        })
                      : undefined,
                  inputAmount2:
                    sendsAmount2 && notEnoughAmount2
                      ? getInsufficientFundsErrorMessage({
                          asset: nativeCurrency.symbol,
                          chain: networks.sourceChain.name
                        })
                      : undefined
                }
              })
            }

            // We have to check if there's enough of the custom fee token to cover L2 gas
            if (
              estimatedL2GasFees > customFeeTokenL1BalanceFloat ||
              (sendsAmount2 && notEnoughAmount2)
            ) {
              return notReady({
                errorMessages: {
                  inputAmount1:
                    estimatedL2GasFees > customFeeTokenL1BalanceFloat
                      ? getInsufficientFundsForGasFeesErrorMessage({
                          asset: nativeCurrency.symbol,
                          chain: networks.sourceChain.name,
                          balance: formatAmount(customFeeTokenL1BalanceFloat),
                          requiredBalance: formatAmount(estimatedL2GasFees)
                        })
                      : undefined,
                  inputAmount2:
                    sendsAmount2 && notEnoughAmount2
                      ? getInsufficientFundsErrorMessage({
                          asset: nativeCurrency.symbol,
                          chain: networks.sourceChain.name
                        })
                      : undefined
                }
              })
            }

            return ready()
          }

          // Everything is paid in ETH, so we sum it up
          const notEnoughEthForGasFees =
            estimatedL1GasFees + estimatedL2GasFees > ethBalanceFloat

          if (notEnoughEthForGasFees || (sendsAmount2 && notEnoughAmount2)) {
            return notReady({
              errorMessages: {
                inputAmount1: notEnoughEthForGasFees
                  ? getInsufficientFundsForGasFeesErrorMessage({
                      asset: ether.symbol,
                      chain: networks.sourceChain.name,
                      balance: formatAmount(ethBalanceFloat),
                      requiredBalance: formatAmount(
                        estimatedL1GasFees + estimatedL2GasFees
                      )
                    })
                  : undefined,
                inputAmount2:
                  sendsAmount2 && notEnoughAmount2
                    ? getInsufficientFundsErrorMessage({
                        asset: nativeCurrency.symbol,
                        chain: networks.sourceChain.name
                      })
                    : undefined
              }
            })
          }

          return ready()
        }

        if (nativeCurrency.isCustom && isDepositMode) {
          // Deposits of the custom fee token will be paid in ETH, so we have to check if there's enough ETH to cover L1 gas
          // Withdrawals of the custom fee token will be treated same as ETH withdrawals (in the case below)

          // Case 1: the parent chain's native balance (eg. ETH) is not enough to cover the retryable creation fee
          if (estimatedL1GasFees > ethBalanceFloat) {
            return notReady({
              errorMessages: {
                inputAmount1: getInsufficientFundsForGasFeesErrorMessage({
                  asset: ether.symbol,
                  chain: networks.sourceChain.name,
                  balance: formatAmount(ethBalanceFloat),
                  requiredBalance: formatAmount(estimatedL1GasFees)
                })
              }
            })
          }

          // Case 2: user has enough parent chain's native balance (eg. ETH), but doesn't have enough child-chain-native token to cover the child-chain execution cost
          if (estimatedL2GasFees > Number(customFeeTokenBalanceFloat)) {
            return notReady({
              errorMessages: {
                inputAmount1: getInsufficientFundsForGasFeesErrorMessage({
                  asset: nativeCurrency.symbol,
                  chain: networks.sourceChain.name,
                  balance: customFeeTokenBalanceFloat
                    ? formatAmount(customFeeTokenBalanceFloat)
                    : formatAmount(constants.Zero),
                  requiredBalance: formatAmount(estimatedL2GasFees)
                })
              }
            })
          }

          return ready()
        }

        // Everything is in the same currency
        // This case also handles custom fee token withdrawals, as `ethBalanceFloat` will reflect the custom fee token balance on the Orbit chain
        const total = Number(amount) + estimatedL1GasFees + estimatedL2GasFees

        if (total > ethBalanceFloat) {
          return notReady({
            errorMessages: {
              inputAmount1: getInsufficientFundsForGasFeesErrorMessage({
                asset: nativeCurrency.symbol,
                chain: networks.sourceChain.name,
                balance: formatAmount(ethBalanceFloat),
                requiredBalance: formatAmount(total)
              })
            }
          })
        }

        return ready()
      }
    }
  }, [
    amount,
    amount2,
    isTransferring,
    destinationAddressError,
    isSmartContractWallet,
    selectedToken,
    isDepositMode,
    ethL1BalanceFloat,
    ethL2BalanceFloat,
    selectedTokenL1BalanceFloat,
    selectedTokenL2BalanceFloat,
    customFeeTokenL1BalanceFloat,
    nativeCurrency.isCustom,
    nativeCurrency.symbol,
    gasSummary,
    childChain.id,
    parentChain.id,
    networks.sourceChain.name,
    isTeleportMode,
    isSelectedTokenWithdrawOnly,
    isSelectedTokenWithdrawOnlyLoading,
    childChain.name,
    selectedRoute,
    selectedRouteContext
  ])
}
