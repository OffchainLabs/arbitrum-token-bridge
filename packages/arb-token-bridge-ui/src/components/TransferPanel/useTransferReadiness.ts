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
import { isWithdrawOnlyToken } from '../../util/WithdrawOnlyUtils'
import {
  TransferPanelMainRichErrorMessage,
  getInsufficientFundsErrorMessage,
  getInsufficientFundsForGasFeesErrorMessage,
  getSmartContractWalletNativeCurrencyTransfersNotSupportedErrorMessage
} from './TransferPanelMainErrorMessage'
import { ether } from '../../constants'
import {
  GasEstimationStatus,
  UseGasSummaryResult,
  useGasSummaryStore
} from '../../hooks/TransferPanel/useGasSummaryStore'

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

export type UseTransferReadinessTransferReady = {
  deposit: boolean
  withdrawal: boolean
}

export type UseTransferReadinessResult = {
  transferReady: UseTransferReadinessTransferReady
  errorMessage?: string | TransferPanelMainRichErrorMessage
}

export function useTransferReadiness({
  amount,
  gasSummary
}: {
  amount: string
  gasSummary: UseGasSummaryResult & { status: GasEstimationStatus }
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

  const selectedTokenIsWithdrawOnly = useMemo(() => {
    if (!selectedToken) {
      return false
    }

    return isWithdrawOnlyToken(selectedToken.address, l2Network.id)
  }, [selectedToken, l2Network])

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

  const disableTransfer = useMemo(() => {
    if (!amount) return true
    if (isTransferring) return true
    if (isSwitchingL2Chain) return true
    if (destinationAddressError) return true

    if (isSmartContractWallet && !selectedToken) {
      return true
    }

    const ethBalanceFloat = isDepositMode
      ? ethL1BalanceFloat
      : ethL2BalanceFloat

    const selectedTokenBalanceFloat = isDepositMode
      ? selectedTokenL1BalanceFloat
      : selectedTokenL2BalanceFloat

    if (!ethBalanceFloat) {
      return true
    }

    // Keep the button disabled while loading gas summary
    if (
      gasSummary.status !== 'success' &&
      gasSummary.status !== 'unavailable'
    ) {
      return true
    }

    const sanitizedEstimatedGasFees = sanitizeEstimatedGasFees(gasSummary, {
      isSmartContractWallet,
      isDepositMode
    })

    const defaultRequiredGasFees =
      sanitizedEstimatedGasFees.estimatedL1GasFees +
      sanitizedEstimatedGasFees.estimatedL2GasFees

    if (selectedToken) {
      // Still loading ERC-20 balance
      if (selectedTokenBalanceFloat === null) {
        return true
      }

      // First, check if there's enough tokens
      if (Number(amount) > selectedTokenBalanceFloat) {
        return true
      }

      // If depositing into a custom fee token network, gas is split between ETH and the custom fee token
      if (nativeCurrency.isCustom && isDepositMode) {
        // Still loading custom fee token balance
        if (customFeeTokenL1BalanceFloat === null) {
          return true
        }

        const { estimatedL1GasFees, estimatedL2GasFees } =
          sanitizedEstimatedGasFees

        // We have to check if there's enough ETH to cover L1 gas, and enough of the custom fee token to cover L2 gas
        return (
          estimatedL1GasFees > ethBalanceFloat ||
          estimatedL2GasFees > customFeeTokenL1BalanceFloat
        )
      }

      // We checked if there's enough tokens, but let's check if there's enough ETH to cover gas
      return defaultRequiredGasFees > ethBalanceFloat
    }

    if (nativeCurrency.isCustom && isDepositMode) {
      // Deposits of the custom fee token will be paid in ETH, so we have to check if there's enough ETH to cover L1 gas
      // Withdrawals of the custom fee token will be treated same as ETH withdrawals (in the case below)
      return defaultRequiredGasFees > ethBalanceFloat
    }

    const notEnoughEthForGasFees =
      Number(amount) + defaultRequiredGasFees > ethBalanceFloat

    return notEnoughEthForGasFees
  }, [
    amount,
    destinationAddressError,
    isSmartContractWallet,
    isDepositMode,
    gasSummary,
    isSwitchingL2Chain,
    isTransferring,
    selectedToken,
    ethL1BalanceFloat,
    ethL2BalanceFloat,
    selectedTokenL1BalanceFloat,
    selectedTokenL2BalanceFloat,
    nativeCurrency,
    customFeeTokenL1BalanceFloat
  ])

  const disableDeposit = useMemo(() => {
    if (disableTransfer) {
      return true
    }

    if (selectedTokenIsWithdrawOnly) {
      return true
    }

    return false
  }, [disableTransfer, selectedTokenIsWithdrawOnly])

  const disableWithdrawal = useMemo(() => {
    if (disableTransfer) {
      return true
    }

    if (selectedToken) {
      const disabledTokens = [
        '0x0e192d382a36de7011f795acc4391cd302003606',
        '0x488cc08935458403a0458e45e20c0159c8ab2c92'
      ]

      if (disabledTokens.includes(selectedToken.address.toLowerCase())) {
        return true
      }
    }

    return false
  }, [disableTransfer, selectedToken])

  const transferPanelMainErrorMessage:
    | string
    | TransferPanelMainRichErrorMessage
    | undefined = useMemo(() => {
    // native currency (ETH or custom fee token) transfers using SC wallets not enabled yet
    if (isSmartContractWallet && !selectedToken) {
      return getSmartContractWalletNativeCurrencyTransfersNotSupportedErrorMessage(
        { asset: nativeCurrency.symbol }
      )
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
      return undefined
    }

    // ERC-20
    if (selectedToken) {
      if (isDepositMode && selectedTokenIsWithdrawOnly) {
        return TransferPanelMainRichErrorMessage.TOKEN_WITHDRAW_ONLY
      }

      // No error while loading balance
      if (selectedTokenBalanceFloat === null) {
        return undefined
      }

      // Check amount against ERC-20 balance
      if (Number(amount) > selectedTokenBalanceFloat) {
        return getInsufficientFundsErrorMessage({
          asset: selectedToken.symbol,
          chain: sourceChain
        })
      }
    }
    // Custom fee token
    else if (nativeCurrency.isCustom) {
      // No error while loading balance
      if (customFeeTokenBalanceFloat === null) {
        return undefined
      }

      // Check amount against custom fee token balance
      if (Number(amount) > customFeeTokenBalanceFloat) {
        return getInsufficientFundsErrorMessage({
          asset: nativeCurrency.symbol,
          chain: sourceChain
        })
      }
    }
    // ETH
    // Check amount against ETH balance
    else if (Number(amount) > ethBalanceFloat) {
      return getInsufficientFundsErrorMessage({
        asset: ether.symbol,
        chain: sourceChain
      })
    }

    // The amount entered is enough funds, but now let's include gas costs
    switch (gasSummary.status) {
      // No error while loading gas costs
      case 'loading':
        return undefined

      case 'error':
        return TransferPanelMainRichErrorMessage.GAS_ESTIMATION_FAILURE

      case 'success': {
        const sanitizedEstimatedGasFees = sanitizeEstimatedGasFees(gasSummary, {
          isSmartContractWallet,
          isDepositMode
        })

        const defaultRequiredGasFees =
          sanitizedEstimatedGasFees.estimatedL1GasFees +
          sanitizedEstimatedGasFees.estimatedL2GasFees

        if (selectedToken) {
          // If depositing into a custom fee token network, gas is split between ETH and the custom fee token
          if (nativeCurrency.isCustom && isDepositMode) {
            // Still loading custom fee token balance
            if (customFeeTokenL1BalanceFloat === null) {
              return undefined
            }

            const { estimatedL1GasFees, estimatedL2GasFees } =
              sanitizedEstimatedGasFees

            // We have to check if there's enough ETH to cover L1 gas
            if (estimatedL1GasFees > ethBalanceFloat) {
              return getInsufficientFundsForGasFeesErrorMessage({
                asset: ether.symbol,
                chain: sourceChain
              })
            }

            // We have to check if there's enough of the custom fee token to cover L2 gas
            if (estimatedL2GasFees > customFeeTokenL1BalanceFloat) {
              return getInsufficientFundsForGasFeesErrorMessage({
                asset: nativeCurrency.symbol,
                chain: sourceChain
              })
            }
          }

          if (defaultRequiredGasFees > ethBalanceFloat) {
            return getInsufficientFundsForGasFeesErrorMessage({
              asset: ether.symbol,
              chain: sourceChain
            })
          }

          return undefined
        }

        if (nativeCurrency.isCustom && isDepositMode) {
          // Deposits of the custom fee token will be paid in ETH, so we have to check if there's enough ETH to cover L1 gas
          // Withdrawals of the custom fee token will be treated same as ETH withdrawals (in the case below)
          if (defaultRequiredGasFees > ethBalanceFloat) {
            return getInsufficientFundsForGasFeesErrorMessage({
              asset: ether.symbol,
              chain: sourceChain
            })
          }

          return undefined
        }

        const notEnoughEthForGasFees =
          Number(amount) + defaultRequiredGasFees > ethBalanceFloat

        if (notEnoughEthForGasFees) {
          return getInsufficientFundsForGasFeesErrorMessage({
            asset: ether.symbol,
            chain: sourceChain
          })
        }

        return undefined
      }
    }
  }, [
    amount,
    isDepositMode,
    isSmartContractWallet,
    l1Network,
    l2Network,
    selectedToken,
    selectedTokenIsWithdrawOnly,
    gasSummary,
    nativeCurrency,
    ethL1BalanceFloat,
    ethL2BalanceFloat,
    selectedTokenL1BalanceFloat,
    selectedTokenL2BalanceFloat,
    customFeeTokenL1BalanceFloat
  ])

  return {
    transferReady: { deposit: !disableDeposit, withdrawal: !disableWithdrawal },
    errorMessage: transferPanelMainErrorMessage
  }
}
