import { useState, useMemo, useCallback, useEffect } from 'react'
import Tippy from '@tippyjs/react'
import { BigNumber, ContractTransaction, constants, utils } from 'ethers'
import { isAddress } from 'ethers/lib/utils'
import { useLatest } from 'react-use'
import { twMerge } from 'tailwind-merge'
import * as Sentry from '@sentry/react'
import { useAccount, useProvider, useSigner } from 'wagmi'

import { useAppState } from '../../state'
import { getNetworkName, isNetwork } from '../../util/networks'
import { Button } from '../common/Button'
import {
  TokenDepositCheckDialog,
  TokenDepositCheckDialogType
} from './TokenDepositCheckDialog'
import { TokenImportDialog } from './TokenImportDialog'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { useArbQueryParams } from '../../hooks/useArbQueryParams'
import { useDialog } from '../common/Dialog'
import { TokenApprovalDialog } from './TokenApprovalDialog'
import { WithdrawalConfirmationDialog } from './WithdrawalConfirmationDialog'
import { DepositConfirmationDialog } from './DepositConfirmationDialog'
import { TransferPanelSummary, useGasSummary } from './TransferPanelSummary'
import {
  TransactionHistoryTab,
  useAppContextActions,
  useAppContextState
} from '../App/AppContext'
import { trackEvent, shouldTrackAnalytics } from '../../util/AnalyticsUtils'
import { TransferPanelMain } from './TransferPanelMain'
import { NonCanonicalTokensBridgeInfo } from '../../util/fastBridges'
import {
  isAllowedL2,
  tokenRequiresApprovalOnL2
} from '../../util/L2ApprovalUtils'
import {
  getL2ERC20Address,
  // getL2ERC20Address,
  // fetchErc20Allowance,
  // fetchErc20L1GatewayAddress,
  // fetchErc20L2GatewayAddress,
  isTokenArbitrumGoerliNativeUSDC,
  isTokenArbitrumOneNativeUSDC
  // isTokenGoerliUSDC,
  // isTokenMainnetUSDC
} from '../../util/TokenUtils'
import { useBalance } from '../../hooks/useBalance'
import { useSwitchNetworkWithConfig } from '../../hooks/useSwitchNetworkWithConfig'
import { useIsConnectedToArbitrum } from '../../hooks/useIsConnectedToArbitrum'
import { useIsConnectedToOrbitChain } from '../../hooks/useIsConnectedToOrbitChain'
import { errorToast, warningToast } from '../common/atoms/Toast'
import { ExternalLink } from '../common/ExternalLink'
import { useAccountType } from '../../hooks/useAccountType'
import { DOCS_DOMAIN, GET_HELP_LINK, ether } from '../../constants'
import {
  getDestinationAddressError,
  useDestinationAddressStore
} from './AdvancedSettings'
import { USDCDepositConfirmationDialog } from './USDCDeposit/USDCDepositConfirmationDialog'
import { USDCWithdrawalConfirmationDialog } from './USDCWithdrawal/USDCWithdrawalConfirmationDialog'
import { CustomFeeTokenApprovalDialog } from './CustomFeeTokenApprovalDialog'
import { fetchPerMessageBurnLimit } from '../../hooks/CCTP/fetchCCTPLimits'
import { isUserRejectedError } from '../../util/isUserRejectedError'
import { formatAmount } from '../../util/NumberUtils'
import {
  getUsdcTokenAddressFromSourceChainId,
  useCctpFetching,
  useCctpState
} from '../../state/cctpState'
import { getAttestationHashAndMessageFromReceipt } from '../../util/cctp/getAttestationHashAndMessageFromReceipt'
import { DepositStatus, MergedTransaction } from '../../state/app/state'
import { getStandardizedTimestamp } from '../../state/app/utils'
import { getContracts, useCCTP } from '../../hooks/CCTP/useCCTP'
import { useNativeCurrency } from '../../hooks/useNativeCurrency'
import { AssetType } from '../../hooks/arbTokenBridge.types'
import { useStyles } from '../../hooks/TransferPanel/useStyles'
import {
  ImportTokenModalStatus,
  getWarningTokenDescription,
  onTxError
} from './TransferPanelUtils'
import { useImportTokenModal } from '../../hooks/TransferPanel/useImportTokenModal'
import { useSummaryVisibility } from '../../hooks/TransferPanel/useSummaryVisibility'
import { useTransferReadiness } from './useTransferReadiness'
import {
  BridgeTransfer,
  BridgeTransferStarterV2,
  MergedTransactionCctp,
  SelectedToken,
  TransferProps
} from '../../token-bridge-sdk/v2/BridgeTransferStarterV2'
import { BridgeTransferStarterFactoryV2 } from '../../token-bridge-sdk/v2/BridgeTransferStarterFactoryV2'
import { NewTransaction } from '../../hooks/useTransactions'
import { checkSignerIsValidForTransferType } from '../../token-bridge-sdk/v2/core/checkSignerIsValidForTransferType'
import { getAddressFromSigner } from '../../token-bridge-sdk/v2/core/getAddressFromSigner'
import { checkForWarningTokens } from '../../token-bridge-sdk/v2/core/checkForWarningTokens'
import { isNonCanonicalToken } from '../../token-bridge-sdk/v2/core/isNonCanonicalToken'
import { Provider } from '@ethersproject/providers'
import { getChainIdFromProvider } from '../../token-bridge-sdk/v2/core/getChainIdFromProvider'

function useTokenFromSearchParams(): string | undefined {
  const [{ token: tokenFromSearchParams }] = useArbQueryParams()

  if (!tokenFromSearchParams) {
    return undefined
  }

  if (!isAddress(tokenFromSearchParams)) {
    return undefined
  }

  return tokenFromSearchParams
}

const networkConnectionWarningToast = () =>
  warningToast(
    <>
      Network connection issue. Please contact{' '}
      <ExternalLink href={GET_HELP_LINK} className="underline">
        support
      </ExternalLink>
      .
    </>
  )

export function TransferPanel() {
  const tokenFromSearchParams = useTokenFromSearchParams()

  const [tokenDepositCheckDialogType, setTokenDepositCheckDialogType] =
    useState<TokenDepositCheckDialogType>('new-token')
  const [importTokenModalStatus, setImportTokenModalStatus] =
    useState<ImportTokenModalStatus>(ImportTokenModalStatus.IDLE)
  const [showSCWalletTooltip, setShowSCWalletTooltip] = useState(false)

  const {
    app: {
      connectionState,
      selectedToken,
      isDepositMode,
      arbTokenBridgeLoaded,
      arbTokenBridge: { eth, token, transactions },
      warningTokens
    }
  } = useAppState()
  const { layout } = useAppContextState()
  const { isTransferring } = layout
  const { address: walletAddress, isConnected } = useAccount()
  const provider = useProvider()
  const { switchNetworkAsync } = useSwitchNetworkWithConfig({
    isSwitchingNetworkBeforeTx: true
  })
  const latestConnectedProvider = useLatest(provider)

  const networksAndSigners = useNetworksAndSigners()
  const latestNetworksAndSigners = useLatest(networksAndSigners)
  const {
    l1: { network: l1Network, provider: l1Provider },
    l2: { network: l2Network, provider: l2Provider }
  } = networksAndSigners

  const { isEOA, isSmartContractWallet } = useAccountType()

  const { data: l1Signer } = useSigner({
    chainId: l1Network.id
  })
  const { data: l2Signer } = useSigner({
    chainId: l2Network.id
  })

  const { data: signer } = useSigner()

  const { setPendingTransfer } = useCctpFetching({
    l1ChainId: l1Network.id,
    l2ChainId: l2Network.id,
    walletAddress,
    pageSize: 10,
    pageNumber: 0,
    type: 'all'
  })

  const {
    openTransactionHistoryPanel,
    setTransferring,
    showCctpDepositsTransactions,
    showCctpWithdrawalsTransactions,
    setTransactionHistoryTab
  } = useAppContextActions()

  const { isArbitrumNova } = isNetwork(l2Network.id)

  const latestEth = useLatest(eth)
  const latestToken = useLatest(token)

  const isConnectedToArbitrum = useLatest(useIsConnectedToArbitrum())
  const isConnectedToOrbitChain = useLatest(useIsConnectedToOrbitChain())

  const { depositButtonColorClassName, withdrawalButtonColorClassName } =
    useStyles()

  // Link the amount state directly to the amount in query params -  no need of useState
  // Both `amount` getter and setter will internally be using `useArbQueryParams` functions
  const [{ amount }, setQueryParams] = useArbQueryParams()

  const setAmount = useCallback(
    (newAmount: string) => {
      setQueryParams({ amount: newAmount })
    },
    [setQueryParams]
  )

  // const { approveForBurn, depositForBurn } = useCCTP({
  //   sourceChainId: isDepositMode
  //     ? latestNetworksAndSigners.current.l1.network.id
  //     : latestNetworksAndSigners.current.l2.network.id
  // })

  const [tokenCheckDialogProps, openTokenCheckDialog] = useDialog()
  const [tokenApprovalDialogProps, openTokenApprovalDialog] = useDialog()
  const [customFeeTokenApprovalDialogProps, openCustomFeeTokenApprovalDialog] =
    useDialog()
  const [withdrawalConfirmationDialogProps, openWithdrawalConfirmationDialog] =
    useDialog()
  const [depositConfirmationDialogProps, openDepositConfirmationDialog] =
    useDialog()
  const [
    usdcWithdrawalConfirmationDialogProps,
    openUSDCWithdrawalConfirmationDialog
  ] = useDialog()
  const [
    usdcDepositConfirmationDialogProps,
    openUSDCDepositConfirmationDialog
  ] = useDialog()

  const {
    eth: [ethL1Balance],
    erc20: [erc20L1Balances]
  } = useBalance({ provider: l1Provider, walletAddress })
  const {
    eth: [ethL2Balance],
    erc20: [erc20L2Balances]
  } = useBalance({ provider: l2Provider, walletAddress })

  const nativeCurrency = useNativeCurrency({ provider: l2Provider })

  const [allowance, setAllowance] = useState<BigNumber | null>(null)
  const [isCctp, setIsCctp] = useState(false)

  const { destinationAddress } = useDestinationAddressStore()

  function clearAmountInput() {
    // clear amount input on transfer panel
    setAmount('')
  }

  useImportTokenModal({
    importTokenModalStatus,
    connectionState,
    setImportTokenModalStatus
  })

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

  const isBridgingANewStandardToken = useMemo(() => {
    const isConnected = typeof l1Network !== 'undefined'
    const isUnbridgedToken =
      selectedToken !== null && typeof selectedToken.l2Address === 'undefined'

    return isConnected && isDepositMode && isUnbridgedToken
  }, [l1Network, isDepositMode, selectedToken])

  function getDialogType(): TokenDepositCheckDialogType | null {
    let type: TokenDepositCheckDialogType | null = null

    if (isBridgingANewStandardToken) {
      type = 'new-token'
    } else {
      const isUserAddedToken =
        selectedToken &&
        selectedToken?.listIds.size === 0 &&
        typeof selectedToken.l2Address === 'undefined'

      if (isUserAddedToken) {
        type = 'user-added-token'
      }
    }

    return type
  }

  const amountBigNumber = useMemo(() => {
    try {
      const amountSafe = amount || '0'

      if (selectedToken) {
        return utils.parseUnits(amountSafe, selectedToken.decimals)
      }

      return utils.parseUnits(amountSafe, nativeCurrency.decimals)
    } catch (error) {
      return constants.Zero
    }
  }, [amount, selectedToken, nativeCurrency])

  const customFeeTokenApproval = async () => {
    const waitForInput = openCustomFeeTokenApprovalDialog()
    const [confirmed] = await waitForInput()
    return confirmed
  }

  const canonicalBridgeDepositConfirmation = async () => {
    const waitForInput = openDepositConfirmationDialog()
    const [confirmed] = await waitForInput()
    return confirmed
  }

  const tokenAllowanceApproval = async () => {
    setIsCctp(false)
    const waitForInput = openTokenApprovalDialog()
    const [confirmed] = await waitForInput()
    return confirmed
  }

  const tokenAllowanceApprovalCctp = async () => {
    setIsCctp(true)
    const waitForInput = openTokenApprovalDialog()
    const [confirmed] = await waitForInput()
    return confirmed
  }

  const showDelayInSmartContractTransaction = async () => {
    // a custom 3 second delay to show a tooltip after SC transaction goes through
    // to give a visual feedback to the user that something happened
    await setTimeout(() => {
      setShowSCWalletTooltip(true)
    }, 3000)
    return true
  }

  const firstTimeTokenBridgingConfirmation = async () => {
    // Check if we need to show `TokenDepositCheckDialog` for first-time bridging
    const dialogType = getDialogType()
    if (dialogType) {
      setTokenDepositCheckDialogType(dialogType)
      const waitForInput = openTokenCheckDialog()
      const [confirmed] = await waitForInput()
      return confirmed
    } else {
      // else pass the check
      return true
    }
  }

  const confirmUsdcDepositFromNormalOrCctpBridge = async () => {
    const waitForInput = openUSDCDepositConfirmationDialog()
    const [confirmed, primaryButtonClicked] = await waitForInput()

    // user declined to transfer altogether
    if (!confirmed) {
      return false
    }

    // user has selected normal bridge (USDC.e)
    if (primaryButtonClicked === 'bridged') {
      return 'bridge-normal-usdce'
    }

    // user wants to bridge to native usdc using Circle's CCTP on destination chain
    return 'bridge-cctp-usd'
  }

  const confirmUsdcWithdrawalForCctp = async () => {
    const waitForInput = openUSDCWithdrawalConfirmationDialog()
    const [confirmed] = await waitForInput()
    return confirmed
  }

  const confirmWithdrawal = async () => {
    const waitForInput = openWithdrawalConfirmationDialog()
    const [confirmed] = await waitForInput()
    return confirmed
  }

  const connectSignerToCorrectChain = async () => {
    let currentNetwork = isDepositMode
      ? latestNetworksAndSigners.current.l1.network
      : latestNetworksAndSigners.current.l2.network
    const currentNetworkName = getNetworkName(currentNetwork.id)
    if (shouldTrackAnalytics(currentNetworkName)) {
      trackEvent('Switch Network and Transfer', {
        type: isDepositMode ? 'Deposit' : 'Withdrawal',
        tokenSymbol: 'USDC',
        assetType: 'ERC-20',
        accountType: isSmartContractWallet ? 'Smart Contract' : 'EOA',
        network: currentNetworkName,
        amount: Number(amount)
      })
    }
    const switchTargetChainId = isDepositMode
      ? latestNetworksAndSigners.current.l1.network.id
      : latestNetworksAndSigners.current.l2.network.id
    try {
      await switchNetworkAsync?.(switchTargetChainId)
      currentNetwork = isDepositMode
        ? latestNetworksAndSigners.current.l1.network
        : latestNetworksAndSigners.current.l2.network
    } catch (e) {
      if (isUserRejectedError(e)) {
        return
      }
    }
  }

  const checkTokenSuspension = async ({
    selectedToken,
    sourceChainProvider,
    destinationChainProvider
  }: {
    selectedToken: SelectedToken
    sourceChainProvider: Provider
    destinationChainProvider: Provider
  }) => {
    // check that a registration is not currently in progress
    const l2RoutedAddress = await getL2ERC20Address({
      erc20L1Address: selectedToken.address,
      l1Provider: sourceChainProvider,
      l2Provider: destinationChainProvider
    })

    // check if the token is suspended
    if (
      selectedToken.l2Address &&
      selectedToken.l2Address.toLowerCase() !== l2RoutedAddress.toLowerCase()
    ) {
      return true
    }

    return false
  }

  // const transferCctpV3 = async () => {
  //   try{

  //   }

  // }

  const transferV3 = async () => {
    try {
      setTransferring(true)

      const sourceChainProvider = isDepositMode ? l1Provider : l2Provider
      const destinationChainProvider = isDepositMode ? l2Provider : l1Provider

      const bridgeTransferStarterV2 = await BridgeTransferStarterFactoryV2.init(
        {
          sourceChainProvider,
          destinationChainProvider,
          selectedToken
        }
      )

      const { transferType } = bridgeTransferStarterV2

      const connectedSigner = signer

      // validation: signer should be connected
      if (!connectedSigner) throw Error('Signer not connected!')

      const address = await getAddressFromSigner(connectedSigner)

      // validation: signer should be compatible with the detected transfer type, else switch network
      const isSignerConnectedToTheCorrectChain =
        await checkSignerIsValidForTransferType({
          connectedSigner,
          destinationChainProvider,
          transferType
        })

      if (!isSignerConnectedToTheCorrectChain) {
        await connectSignerToCorrectChain()
        return // exit for now, because if we continue, the original Starter is no longer valid
      }

      // validation: SCW transfers are not enabled for ETH transfers yet
      if (transferType.includes('eth') && isSmartContractWallet) {
        console.error(
          "ETH transfers aren't enabled for smart contract wallets."
        )
        return
      }

      // validation: if destination address is added, validate it
      const destinationAddressError = await getDestinationAddressError({
        destinationAddress,
        isSmartContractWallet
      })
      if (destinationAddressError) {
        console.error(destinationAddressError)
        return
      }

      // logic: check if native currency approval is required for selected transfer type
      const isNativeCurrencyApprovalRequired =
        await bridgeTransferStarterV2.requiresNativeCurrencyApproval({
          connectedSigner,
          nativeCurrency,
          amount: amountBigNumber,
          destinationChainProvider
        })

      if (isNativeCurrencyApprovalRequired) {
        // user confirmation: show native currency approval dialog
        const userConfirmation = await customFeeTokenApproval()
        if (!userConfirmation) return false

        // logic: approve native currency
        await bridgeTransferStarterV2.approveNativeCurrency({
          connectedSigner,
          destinationChainProvider
        })
      }

      // checks for selected token, if any
      if (selectedToken) {
        const tokenAddress = selectedToken.address

        // validation: is selected token deployed on parent-chain?
        if (!tokenAddress) Error('Token not deployed on source chain.')

        // validation: check if the selected token is a warning token
        const warning = await checkForWarningTokens(tokenAddress)
        if (warning) throw Error(warning)

        // validation: check if the selected token is suspended
        const isTokenSuspended = await checkTokenSuspension({
          selectedToken,
          sourceChainProvider,
          destinationChainProvider
        })
        if (isTokenSuspended) {
          const message =
            'Depositing is currently suspended for this token as a new gateway is being registered. Please try again later and contact support if this issue persists.'
          alert(message)
          throw message
        }

        // user confirmation: check for first time token deployment from user
        const userConfirmationForFirstTimeTokenBridging =
          await firstTimeTokenBridgingConfirmation()
        if (!userConfirmationForFirstTimeTokenBridging) {
          throw Error('User declined bridging the token for the first time')
        }

        // validation: check if the token is non-canonical
        if (isNonCanonicalToken(tokenAddress)) {
          const userConfirmation = await canonicalBridgeDepositConfirmation()
          if (!userConfirmation) {
            throw Error('Deposit via canonical bridge declined')
          }
        }

        // logic: check if selected token approval is required for selected transfer type
        const isTokenApprovalRequired =
          await bridgeTransferStarterV2.requiresTokenApproval({
            amount: amountBigNumber,
            address,
            selectedToken,
            sourceChainProvider,
            destinationChainProvider
          })

        if (isTokenApprovalRequired) {
          // user confirmation: show selected token approval dialog
          const userConfirmation = await tokenAllowanceApproval()
          if (!userConfirmation) return false

          // logic: approve selected token
          await bridgeTransferStarterV2.approveToken({
            connectedSigner,
            destinationChainProvider,
            selectedToken
          })
        }
      }

      // user confirmation: if withdrawal (and not smart-contract-wallet), confirm from user about the delays involved
      if (transferType.includes('withdrawal') && !isSmartContractWallet) {
        const withdrawalConfirmation = await confirmWithdrawal()
        if (!withdrawalConfirmation) return false
      }

      // logic: finally, call the transfer function
      const transfer = await bridgeTransferStarterV2.transfer({
        amount: amountBigNumber,
        destinationChainProvider,
        connectedSigner,
        selectedToken
      })

      // transaction submitted callback
      onTxSubmit(transfer)
    } catch (error) {
      console.error(error)
    } finally {
      setTransferring(false)
      clearAmountInput()
    }
  }

  const onTxSubmit = async (transfer: BridgeTransfer) => {
    // here, handle all transformations

    const sourceChainProvider = isDepositMode ? l1Provider : l2Provider
    const destinationChainProvider = isDepositMode ? l2Provider : l1Provider

    const { transferType, sourceChainTransaction } = transfer
    const isDeposit = transferType.includes('deposit')
    const isNativeCurrencyTransfer = transferType.includes('eth')

    const sourceChainId = await getChainIdFromProvider(sourceChainProvider)
    const destinationChainId = await getChainIdFromProvider(
      destinationChainProvider
    )

    const transactionObject = {
      type: isDeposit ? 'deposit-l1' : 'withdraw',
      status: 'pending',
      value: utils.formatUnits(
        amountBigNumber,
        isNativeCurrencyTransfer
          ? nativeCurrency.decimals
          : selectedToken?.decimals
      ),
      txID: sourceChainTransaction.hash,
      assetName: isNativeCurrencyTransfer ? 'ETH' : selectedToken?.symbol,
      assetType: isNativeCurrencyTransfer ? AssetType.ETH : AssetType.ERC20,
      sender: walletAddress,
      destination: destinationAddress ?? walletAddress,
      l1NetworkID: sourceChainId.toString(),
      l2NetworkID: destinationChainId.toString()
    } as NewTransaction

    // add transaction to the transaction history
    transactions.addTransaction(transactionObject)

    // set the correct tab
    setTransactionHistoryTab(
      isDeposit
        ? TransactionHistoryTab.DEPOSITS
        : TransactionHistoryTab.WITHDRAWALS
    )

    // open tx history
    openTransactionHistoryPanel()
  }

  // // SDK should not care about UI confirmations or popups, so in SDK we expose callbacks
  // // If provided, the SDK will call these functions before proceeding to next steps
  // const externalCallbacks = {
  //   customFeeTokenApproval,
  //   canonicalBridgeDepositConfirmation,
  //   tokenAllowanceApproval,
  //   showDelayInSmartContractTransaction,
  //   firstTimeTokenBridgingConfirmation,
  //   confirmUsdcDepositFromNormalOrCctpBridge,
  //   confirmUsdcWithdrawalForCctp,
  //   tokenAllowanceApprovalCctp,
  //   confirmWithdrawal
  // }

  // // After done with the transfer, here is a consolidate version of the tx lifecycle methods
  // // A bit of cases here, but we can remove them as SDK matures and there is a better way of handling tx tracking in sdk
  // const commonTxLifecycle: TransferProps['txLifecycle'] = {
  //   onTxSubmit: ({ tx, oldBridgeCompatibleTxObjToBeRemovedLater }) => {
  //     if (
  //       !(oldBridgeCompatibleTxObjToBeRemovedLater as MergedTransaction).isCctp
  //     ) {
  //       // for normal case
  //       const transactionHistoryObject =
  //         oldBridgeCompatibleTxObjToBeRemovedLater as NewTransaction

  //       // add transaction to the transaction history
  //       transactions.addTransaction(transactionHistoryObject)
  //       openTransactionHistoryPanel()
  //       setTransferring(false)
  //       clearAmountInput()
  //     } else {
  //       // for cctp case
  //       const transactionHistoryObject =
  //         oldBridgeCompatibleTxObjToBeRemovedLater as MergedTransaction

  //       setPendingTransfer(
  //         transactionHistoryObject,
  //         transactionHistoryObject.isWithdrawal ? 'withdrawal' : 'deposit'
  //       )

  //       if (!transactionHistoryObject.isWithdrawal) {
  //         showCctpDepositsTransactions()
  //       } else {
  //         showCctpWithdrawalsTransactions()
  //       }
  //       setTransactionHistoryTab(TransactionHistoryTab.CCTP)
  //       openTransactionHistoryPanel()
  //       setTransferring(false)
  //       clearAmountInput()
  //     }
  //   },
  //   onTxConfirm: ({ txReceipt, oldBridgeCompatibleTxObjToBeRemovedLater }) => {
  //     // in case of CCTP
  //     const transactionHistoryObject =
  //       oldBridgeCompatibleTxObjToBeRemovedLater as MergedTransactionCctp
  //     if (transactionHistoryObject.isCctp) {
  //       const { attestationHash, messageBytes } = transactionHistoryObject
  //       setPendingTransfer(
  //         {
  //           txId: txReceipt.transactionHash,
  //           blockNum: txReceipt.blockNumber,
  //           status: 'Unconfirmed',
  //           cctpData: {
  //             attestationHash,
  //             messageBytes
  //           }
  //         },
  //         transactionHistoryObject.isWithdrawal ? 'withdrawal' : 'deposit'
  //       )
  //     }
  //   },
  //   onTxError: error => {
  //     onTxError(error)
  //     setTransferring(false)
  //   }
  // }

  // // Final transfer function, just call this on the press of the Move button :)
  // const transferV2 = async () => {
  //   try {
  //     if (!bridgeTransferStarterV2) throw Error('Starter not initialized yet!')
  //     setTransferring(true)

  //     const {
  //       amount,
  //       isSmartContractWallet,
  //       destinationAddress,
  //       sourceChainProvider,
  //       destinationChainProvider,
  //       connectedSigner,
  //       nativeCurrency,
  //       nativeCurrencyBalance,
  //       selectedToken,
  //       selectedTokenBalance
  //     } = BRIDGE_STATE

  //     const sourceChainNetwork = await sourceChainProvider.getNetwork()
  //     const sourceChainId = sourceChainNetwork.chainId

  //     const destinationChainNetwork =
  //       await destinationChainProvider.getNetwork()
  //     const destinationChainId = destinationChainNetwork.chainId

  //     /*

  //     ----------------------------------------
  //     INPUT VALIDATION PHASE
  //     ----------------------------------------

  //     */

  //     const address = await connectedSigner?.getAddress()
  //     if (!connectedSigner || !address) throw 'Signer is not connected'

  //     const destinationAddressError = await getDestinationAddressError({
  //       destinationAddress,
  //       isSmartContractWallet
  //     })
  //     if (destinationAddressError) {
  //       console.error(destinationAddressError)
  //       return
  //     }

  //     /*

  //     ----------------------------------------
  //     NATIVE CURRENCY REQUIRES APPROVAL?
  //     ----------------------------------------

  //     */

  //     const requiresNativeCurrencyApproval =
  //       await bridgeTransferStarterV2.requiresNativeCurrencyApproval({
  //         address,
  //         amount,
  //         sourceChainProvider,
  //         destinationChainProvider,
  //         nativeCurrency
  //       })

  //     if (requiresNativeCurrencyApproval) {
  //       if (await customFeeTokenApproval()) {
  //         // show custom fee token approval popup
  //         await bridgeTransferStarterV2.approveNativeCurrency({
  //           connectedSigner,
  //           destinationChainProvider
  //         })
  //       }
  //     }

  //     const brigeTransferV2Result = await bridgeTransferStarterV2.transfer({
  //       externalCallbacks,
  //       txLifecycle: commonTxLifecycle
  //     })
  //     console.log('tx receipt received - ', brigeTransferV2Result)
  //     transactions.updateTransaction(brigeTransferV2Result.sourceChain.tx)
  //   } catch (error) {
  //     // handle for different types of error logged by SDK here, to show error popup/ log in sentry / show other UIs etc
  //     throw error
  //   }
  // }

  // Only run gas estimation when it makes sense, i.e. when there is enough funds
  const shouldRunGasEstimation = useMemo(() => {
    let balanceFloat: number | null

    // Compare ERC-20 balance
    if (selectedToken) {
      balanceFloat = isDepositMode
        ? selectedTokenL1BalanceFloat
        : selectedTokenL2BalanceFloat
    }
    // Compare custom fee token balance
    else if (nativeCurrency.isCustom) {
      balanceFloat = isDepositMode
        ? customFeeTokenL1BalanceFloat
        : ethL2BalanceFloat
    }
    // Compare ETH balance
    else {
      balanceFloat = isDepositMode ? ethL1BalanceFloat : ethL2BalanceFloat
    }

    if (!balanceFloat) {
      return false
    }

    return Number(amount) <= balanceFloat
  }, [
    amount,
    selectedToken,
    isDepositMode,
    nativeCurrency,
    ethL1BalanceFloat,
    ethL2BalanceFloat,
    selectedTokenL1BalanceFloat,
    selectedTokenL2BalanceFloat,
    customFeeTokenL1BalanceFloat
  ])

  const gasSummary = useGasSummary(
    amountBigNumber,
    selectedToken,
    shouldRunGasEstimation
  )

  const { transferReady, errorMessage } = useTransferReadiness({
    amount,
    gasSummary
  })

  const { isSummaryVisible } = useSummaryVisibility({
    transferReady,
    gasEstimationStatus: gasSummary.status
  })

  return (
    <>
      <TokenApprovalDialog
        {...tokenApprovalDialogProps}
        amount={amount}
        allowance={allowance}
        token={selectedToken}
        isCctp={isCctp}
      />

      {nativeCurrency.isCustom && (
        <CustomFeeTokenApprovalDialog
          {...customFeeTokenApprovalDialogProps}
          customFeeToken={nativeCurrency}
        />
      )}

      <WithdrawalConfirmationDialog
        {...withdrawalConfirmationDialogProps}
        amount={amount}
      />

      <DepositConfirmationDialog
        {...depositConfirmationDialogProps}
        amount={amount}
      />

      <USDCWithdrawalConfirmationDialog
        {...usdcWithdrawalConfirmationDialogProps}
        amount={amount}
      />

      <USDCDepositConfirmationDialog
        {...usdcDepositConfirmationDialogProps}
        amount={amount}
      />

      <div className="flex max-w-screen-lg flex-col space-y-6 bg-white shadow-[0px_4px_20px_rgba(0,0,0,0.2)] lg:flex-row lg:space-x-6 lg:space-y-0 lg:rounded-xl">
        <TransferPanelMain
          amount={amount}
          setAmount={setAmount}
          errorMessage={errorMessage}
        />

        <div className="border-r border-gray-2" />

        <div
          style={
            isSummaryVisible
              ? {}
              : {
                  background: `url(/images/ArbitrumFaded.webp)`,
                  backgroundSize: 'contain',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'center'
                }
          }
          className="transfer-panel-stats flex w-full flex-col justify-between bg-gray-2 px-6 py-6 lg:rounded-br-xl lg:rounded-tr-xl lg:bg-white lg:px-0 lg:pr-6"
        >
          <div className="flex flex-col">
            <div className="hidden lg:block">
              <span className="text-2xl text-gray-dark">Summary</span>
              <div className="h-4" />
            </div>

            {isSummaryVisible ? (
              <TransferPanelSummary
                amount={parseFloat(amount)}
                token={selectedToken}
                gasSummary={gasSummary}
              />
            ) : (
              <div className="hidden text-lg text-gray-dark lg:block lg:min-h-[297px]">
                <span className="text-xl">
                  Bridging summary will appear here.
                </span>
              </div>
            )}
          </div>

          {isDepositMode ? (
            <Button
              variant="primary"
              loading={isTransferring}
              disabled={!transferReady.deposit}
              onClick={transferV3}
              className={twMerge(
                'w-full bg-eth-dark py-4 text-lg lg:text-2xl',
                depositButtonColorClassName
              )}
            >
              <span className="block w-[360px] truncate">
                {isSmartContractWallet && isTransferring
                  ? 'Sending request...'
                  : `Move funds to ${getNetworkName(l2Network.id)}`}
              </span>
            </Button>
          ) : (
            <Button
              variant="primary"
              loading={isTransferring}
              disabled={!transferReady.withdrawal}
              onClick={transferV3}
              className={twMerge(
                'w-full py-4 text-lg lg:text-2xl',
                withdrawalButtonColorClassName
              )}
            >
              <span className="block w-[360px] truncate">
                {isSmartContractWallet && isTransferring
                  ? 'Sending request...'
                  : `Move funds to ${getNetworkName(l1Network.id)}`}
              </span>
            </Button>
          )}
        </div>

        {typeof tokenFromSearchParams !== 'undefined' && (
          <TokenImportDialog
            isOpen={importTokenModalStatus === ImportTokenModalStatus.OPEN}
            onClose={() =>
              setImportTokenModalStatus(ImportTokenModalStatus.CLOSED)
            }
            tokenAddress={tokenFromSearchParams}
          />
        )}

        <TokenDepositCheckDialog
          {...tokenCheckDialogProps}
          type={tokenDepositCheckDialogType}
          symbol={selectedToken ? selectedToken.symbol : nativeCurrency.symbol}
        />

        {showSCWalletTooltip && (
          <Tippy
            placement="bottom-end"
            maxWidth="auto"
            onClickOutside={() => setShowSCWalletTooltip(false)}
            theme="orange"
            visible={showSCWalletTooltip}
            content={
              <div className="flex flex-col">
                <span>
                  <b>
                    To continue, please approve tx on your smart contract
                    wallet.
                  </b>
                </span>
                <span>
                  If you have k of n signers, then k of n will need to sign.
                </span>
              </div>
            }
          >
            {/* Override margin coming from Tippy that causes layout disruptions */}
            <div className="!m-0" />
          </Tippy>
        )}
      </div>
    </>
  )
}
