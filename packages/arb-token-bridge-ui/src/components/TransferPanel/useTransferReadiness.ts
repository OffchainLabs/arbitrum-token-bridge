import { useMemo } from 'react'
import { useAccount } from 'wagmi'
import { utils } from 'ethers'

import { useAccountType } from '../../hooks/useAccountType'
import { useAppState } from '../../state'
import { useBalance } from '../../hooks/useBalance'
import { useNativeCurrency } from '../../hooks/useNativeCurrency'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import {
  isTokenArbitrumGoerliNativeUSDC,
  isTokenArbitrumOneNativeUSDC
} from '../../util/TokenUtils'
import { useIsSwitchingL2Chain } from './TransferPanelMainUtils'
import { useAppContextState } from '../App/AppContext'
import { useDestinationAddressStore } from './AdvancedSettings'
import { UseGasSummaryResult } from './TransferPanelSummary'
import { isWithdrawOnlyToken } from '../../util/WithdrawOnlyUtils'
import {
  TransferReadinessRichErrorMessage,
  getInsufficientFundsErrorMessage,
  getInsufficientFundsForGasFeesErrorMessage,
  getSmartContractWalletNativeCurrencyTransfersNotSupportedErrorMessage
} from './useTransferReadinessUtils'
import { ether } from '../../constants'
import { isTransferDisabledToken } from '../../util/TokenTransferDisabledUtils'

function sanitizeEstimatedGasFees(
  gasSummary: UseGasSummaryResult,
  options: { isSmartContractWallet: boolean; isDepositMode: boolean }
) {
  // For smart contract wallets, the relayer pays the gas fees
  if (options.isSmartContractWallet) {
    if (options.isDepositMode) {
      // The L2 fee is paid in callvalue and needs to come from the smart contract wallet for retryable cost estimation to succeed
      return {
        estimatedL1GasFees: 0,
        estimatedL2GasFees: gasSummary.estimatedL2GasFees
      }
    }

    return {
      estimatedL1GasFees: 0,
      estimatedL2GasFees: 0
    }
  }

  return {
    estimatedL1GasFees: gasSummary.estimatedL1GasFees,
    estimatedL2GasFees: gasSummary.estimatedL2GasFees
  }
}

function withdrawalDisabled(token: string) {
  return [
    '0x0e192d382a36de7011f795acc4391cd302003606',
    '0x488cc08935458403a0458e45e20c0159c8ab2c92'
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
    errorMessage: string | TransferReadinessRichErrorMessage | undefined
  } = {
    errorMessage: undefined
  }
) {
  const result: UseTransferReadinessResult = {
    transferReady: { deposit: false, withdrawal: false }
  }

  return { ...result, ...params }
}

export type UseTransferReadinessTransferReady = {
  deposit: boolean
  withdrawal: boolean
}

export type UseTransferReadinessResult = {
  transferReady: UseTransferReadinessTransferReady
  errorMessage?: string | TransferReadinessRichErrorMessage
}

export function useTransferReadiness({
  amount,
  gasSummary
}: {
  amount: string
  gasSummary: UseGasSummaryResult
}): UseTransferReadinessResult {
  const {
    app: { isDepositMode, selectedToken }
  } = useAppState()
  const {
    layout: { isTransferring }
  } = useAppContextState()
  const {
    l1: { provider: l1Provider, network: l1Network },
    l2: { provider: l2Provider, network: l2Network }
  } = useNetworksAndSigners()
  const { address: walletAddress } = useAccount()
  const { isSmartContractWallet } = useAccountType()
  const isSwitchingL2Chain = useIsSwitchingL2Chain()
  const nativeCurrency = useNativeCurrency({ provider: l2Provider })
  const {
    eth: [ethL1Balance],
    erc20: [erc20L1Balances]
  } = useBalance({ provider: l1Provider, walletAddress })
  const {
    eth: [ethL2Balance],
    erc20: [erc20L2Balances]
  } = useBalance({ provider: l2Provider, walletAddress })
  const { error: destinationAddressError } = useDestinationAddressStore()

  const ethL1BalanceFloat = useMemo(
    () => (ethL1Balance ? parseFloat(utils.formatEther(ethL1Balance)) : null),
    [ethL1Balance]
  )

  const ethL2BalanceFloat = useMemo(
    () => (ethL2Balance ? parseFloat(utils.formatEther(ethL2Balance)) : null),
    [ethL2Balance]
  )

  const selectedTokenL1BalanceFloat = useMemo(() => {
    if (!selectedToken) {
      return null
    }

    const balance = erc20L1Balances?.[selectedToken.address.toLowerCase()]

    if (!balance) {
      return null
    }

    return parseFloat(utils.formatUnits(balance, selectedToken.decimals))
  }, [selectedToken, erc20L1Balances])

  const selectedTokenL2BalanceFloat = useMemo(() => {
    if (!selectedToken) {
      return null
    }

    const isL2NativeUSDC =
      isTokenArbitrumOneNativeUSDC(selectedToken.address) ||
      isTokenArbitrumGoerliNativeUSDC(selectedToken.address)

    const selectedTokenL2Address = isL2NativeUSDC
      ? selectedToken.address.toLowerCase()
      : (selectedToken.l2Address || '').toLowerCase()

    const balance = erc20L2Balances?.[selectedTokenL2Address]

    if (!balance) {
      return null
    }

    return parseFloat(utils.formatUnits(balance, selectedToken.decimals))
  }, [selectedToken, erc20L2Balances])

  const customFeeTokenL1BalanceFloat = useMemo(() => {
    if (!nativeCurrency.isCustom) {
      return null
    }

    const balance = erc20L1Balances?.[nativeCurrency.address]

    if (!balance) {
      return null
    }

    return parseFloat(utils.formatUnits(balance, nativeCurrency.decimals))
  }, [nativeCurrency, erc20L1Balances])

  return useMemo(() => {
    if (!amount) {
      return notReady()
    }

    if (isTransferring || isSwitchingL2Chain) {
      return notReady()
    }

    // native currency (ETH or custom fee token) transfers using SC wallets not enabled yet
    if (isSmartContractWallet && !selectedToken) {
      return notReady({
        errorMessage:
          getSmartContractWalletNativeCurrencyTransfersNotSupportedErrorMessage(
            { asset: nativeCurrency.symbol }
          )
      })
    }

    // Check if destination address is valid for ERC20 transfers
    if (destinationAddressError) {
      return notReady()
    }

    const sourceChain = isDepositMode ? l1Network.name : l2Network.name

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

    // ERC-20
    if (selectedToken) {
      const selectedTokenIsWithdrawOnly = isWithdrawOnlyToken(
        selectedToken.address,
        l2Network.id
      )

      const selectedTokenIsDisabled = isTransferDisabledToken(
        selectedToken.address,
        l2Network.id
      )

      if (isDepositMode && selectedTokenIsWithdrawOnly) {
        return notReady({
          errorMessage: TransferReadinessRichErrorMessage.TOKEN_WITHDRAW_ONLY
        })
      } else if (selectedTokenIsDisabled) {
        return notReady({
          errorMessage:
            TransferReadinessRichErrorMessage.TOKEN_TRANSFER_DISABLED
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
          errorMessage: getInsufficientFundsErrorMessage({
            asset: selectedToken.symbol,
            chain: sourceChain
          })
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
      if (Number(amount) > customFeeTokenBalanceFloat) {
        return notReady({
          errorMessage: getInsufficientFundsErrorMessage({
            asset: nativeCurrency.symbol,
            chain: sourceChain
          })
        })
      }
    }
    // ETH
    // Check amount against ETH balance
    else if (Number(amount) > ethBalanceFloat) {
      return notReady({
        errorMessage: getInsufficientFundsErrorMessage({
          asset: ether.symbol,
          chain: sourceChain
        })
      })
    }

    // The amount entered is enough funds, but now let's include gas costs
    switch (gasSummary.status) {
      // No error while loading gas costs
      case 'idle':
      case 'loading':
        return notReady()

      case 'unavailable':
        return ready()

      case 'error':
        return notReady({
          errorMessage: TransferReadinessRichErrorMessage.GAS_ESTIMATION_FAILURE
        })

      case 'success': {
        const { estimatedL1GasFees, estimatedL2GasFees } =
          sanitizeEstimatedGasFees(gasSummary, {
            isSmartContractWallet,
            isDepositMode
          })

        if (selectedToken) {
          // If depositing into a custom fee token network, gas is split between ETH and the custom fee token
          if (nativeCurrency.isCustom && isDepositMode) {
            // Still loading custom fee token balance
            if (customFeeTokenL1BalanceFloat === null) {
              return notReady()
            }

            // We have to check if there's enough ETH to cover L1 gas
            if (estimatedL1GasFees > ethBalanceFloat) {
              return notReady({
                errorMessage: getInsufficientFundsForGasFeesErrorMessage({
                  asset: ether.symbol,
                  chain: sourceChain
                })
              })
            }

            // We have to check if there's enough of the custom fee token to cover L2 gas
            if (estimatedL2GasFees > customFeeTokenL1BalanceFloat) {
              return notReady({
                errorMessage: getInsufficientFundsForGasFeesErrorMessage({
                  asset: nativeCurrency.symbol,
                  chain: sourceChain
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
                chain: sourceChain
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
                chain: sourceChain
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
              chain: sourceChain
            })
          })
        }

        return ready()
      }
    }
  }, [
    amount,
    isDepositMode,
    isSmartContractWallet,
    isTransferring,
    isSwitchingL2Chain,
    destinationAddressError,
    l1Network,
    l2Network,
    selectedToken,
    gasSummary,
    nativeCurrency,
    ethL1BalanceFloat,
    ethL2BalanceFloat,
    selectedTokenL1BalanceFloat,
    selectedTokenL2BalanceFloat,
    customFeeTokenL1BalanceFloat
  ])
}
