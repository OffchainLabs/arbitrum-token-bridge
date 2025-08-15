import dayjs from 'dayjs'
import { useState, useMemo, useCallback, useEffect } from 'react'
import Tippy from '@tippyjs/react'
import { constants, utils } from 'ethers'
import { useLatest } from 'react-use'
import { useAccount, useConfig } from 'wagmi'
import { TransactionResponse } from '@ethersproject/providers'
import { twMerge } from 'tailwind-merge'
import { scaleFrom18DecimalsToNativeTokenDecimals } from '@arbitrum/sdk'
import { shallow } from 'zustand/shallow'

import { useAppState } from '../../state'
import { getNetworkName, isNetwork } from '../../util/networks'
import { TokenDepositCheckDialogType } from './TokenDepositCheckDialog'
import {
  TokenImportDialog,
  useTokenImportDialogStore
} from './TokenImportDialog'
import {
  TabParamEnum,
  tabToIndex,
  useArbQueryParams
} from '../../hooks/useArbQueryParams'
import { useDialog } from '../common/Dialog'
import { useAppContextActions } from '../App/AppContext'
import { trackEvent } from '../../util/AnalyticsUtils'
import { TransferPanelMain } from './TransferPanelMain'
import { isGatewayRegistered, isTokenNativeUSDC } from '../../util/TokenUtils'
import { useSwitchNetworkWithConfig } from '../../hooks/useSwitchNetworkWithConfig'
import { errorToast, warningToast } from '../common/atoms/Toast'
import { useAccountType } from '../../hooks/useAccountType'
import { DOCS_DOMAIN, GET_HELP_LINK } from '../../constants'
import { isUserRejectedError } from '../../util/isUserRejectedError'
import { getUsdcTokenAddressFromSourceChainId } from '../../state/cctpState'
import {
  DepositStatus,
  LifiMergedTransaction,
  MergedTransaction,
  WithdrawalStatus
} from '../../state/app/state'
import { useNativeCurrency } from '../../hooks/useNativeCurrency'
import {
  AssetType,
  DepositGasEstimates
} from '../../hooks/arbTokenBridge.types'
import {
  ImportTokenModalStatus,
  getWarningTokenDescription
} from './TransferPanelUtils'
import { useTransactionHistory } from '../../hooks/useTransactionHistory'
import { useNetworks } from '../../hooks/useNetworks'
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship'
import { CctpTransferStarter } from '@/token-bridge-sdk/CctpTransferStarter'
import { BridgeTransferStarterFactory } from '@/token-bridge-sdk/BridgeTransferStarterFactory'
import {
  BridgeTransfer,
  TransferOverrides
} from '@/token-bridge-sdk/BridgeTransferStarter'
import { addDepositToCache } from '../TransactionHistory/helpers'
import {
  convertBridgeSdkToMergedTransaction,
  convertBridgeSdkToPendingDepositTransaction
} from './bridgeSdkConversionUtils'
import { getBridgeTransferProperties } from '../../token-bridge-sdk/utils'
import { useSetInputAmount } from '../../hooks/TransferPanel/useSetInputAmount'
import { getSmartContractWalletTeleportTransfersNotSupportedErrorMessage } from './useTransferReadinessUtils'
import { useTokensFromLists, useTokensFromUser } from './TokenSearchUtils'
import { useSelectedToken } from '../../hooks/useSelectedToken'
import { useBalances } from '../../hooks/useBalances'
import { useIsBatchTransferSupported } from '../../hooks/TransferPanel/useIsBatchTransferSupported'
import { useTokenLists } from '../../hooks/useTokenLists'
import { normalizeTimestamp } from '../../state/app/utils'
import { useDestinationAddressError } from './hooks/useDestinationAddressError'
import { ExternalLink } from '../common/ExternalLink'
import { useIsTransferAllowed } from './hooks/useIsTransferAllowed'
import { MoveFundsButton } from './MoveFundsButton'
import { useAmountBigNumber } from './hooks/useAmountBigNumber'
import { useSourceChainNativeCurrencyDecimals } from '../../hooks/useSourceChainNativeCurrencyDecimals'
import { useEthersSigner } from '../../util/wagmi/useEthersSigner'
import { OftV2TransferStarter } from '../../token-bridge-sdk/OftV2TransferStarter'
import { highlightTransactionHistoryDisclaimer } from '../TransactionHistory/TransactionHistoryDisclaimer'
import { useDialog2, DialogWrapper, DialogType } from '../common/Dialog2'
import { addressesEqual } from '../../util/AddressUtils'
import { drive, UiDriverStepExecutor } from '../../ui-driver/UiDriver'
import { stepGeneratorForCctp } from '../../ui-driver/UiDriverCctp'
import { ConnectWalletButton } from './ConnectWalletButton'
import { Routes } from './Routes/Routes'
import { useError } from '../../hooks/useError'
import { isLifiRoute, useRouteStore } from './hooks/useRouteStore'
import { LifiTransferStarter } from '@/token-bridge-sdk/LifiTransferStarter'
import { getAmountLoss } from './HighSlippageWarningDialog'
import { useLifiMergedTransactionCacheStore } from '../../hooks/useLifiMergedTransactionCacheStore'
import { getStepTransaction } from '@lifi/sdk'
import { isValidTransactionRequest } from '../../util/isValidTransactionRequest'
import { getAmountToPay } from './useTransferReadiness'
import { ToSConfirmationCheckbox } from './ToSConfirmationCheckbox'
import { WidgetTransferPanel } from '../Widget/WidgetTransferPanel'
import { useMode } from '../../hooks/useMode'
import { getTokenOverride } from '../../pages/api/crosschain-transfers/utils'
import { ReceiveFundsHeader } from './ReceiveFundsHeader'

const signerUndefinedError = 'Signer is undefined'
const transferNotAllowedError = 'Transfer not allowed'

const networkConnectionWarningToast = () =>
  warningToast(
    <>
      Network connection issue. Please contact{' '}
      <ExternalLink href={GET_HELP_LINK} className="underline">
        support
      </ExternalLink>
      .
    </>,
    { autoClose: false }
  )

export function TransferPanel() {
  // Link the amount state directly to the amount in query params -  no need of useState
  // Both `amount` getter and setter will internally be using `useArbQueryParams` functions
  const [
    { amount, amount2, destinationAddress, token: tokenFromSearchParams },
    setQueryParams
  ] = useArbQueryParams()
  const { embedMode } = useMode()
  const [importTokenModalStatus, setImportTokenModalStatus] =
    useState<ImportTokenModalStatus>(ImportTokenModalStatus.IDLE)
  const [showSmartContractWalletTooltip, setShowSmartContractWalletTooltip] =
    useState(false)
  const {
    app: {
      arbTokenBridge: { token },
      warningTokens
    }
  } = useAppState()
  const { address: walletAddress, chain, isConnected } = useAccount()
  const [selectedToken, setSelectedToken] = useSelectedToken()
  const { switchChainAsync } = useSwitchNetworkWithConfig({
    isSwitchingNetworkBeforeTx: true
  })
  // do not use `useChainId` because it won't detect chains outside of our wagmi config
  const latestChain = useLatest(chain)
  const [networks] = useNetworks()
  const latestNetworks = useLatest(networks)
  const tokensFromLists = useTokensFromLists()
  const tokensFromUser = useTokensFromUser()
  const {
    current: {
      childChain,
      childChainProvider,
      parentChain,
      parentChainProvider,
      isDepositMode,
      isTeleportMode
    }
  } = useLatest(useNetworksRelationship(latestNetworks.current))
  const { isLoading: isLoadingTokenLists } = useTokenLists(childChain.id)
  const isBatchTransferSupported = useIsBatchTransferSupported()
  const nativeCurrencyDecimalsOnSourceChain =
    useSourceChainNativeCurrencyDecimals()

  const nativeCurrency = useNativeCurrency({ provider: childChainProvider })

  const { isSmartContractWallet } = useAccountType()

  const { current: signer } = useLatest(
    useEthersSigner({ chainId: networks.sourceChain.id })
  )
  const wagmiConfig = useConfig()

  const { setTransferring } = useAppContextActions()
  const { addPendingTransaction } = useTransactionHistory(walletAddress)
  const { selectedRoute, clearRoute, context } = useRouteStore(
    state => ({
      selectedRoute: state.selectedRoute,
      clearRoute: state.clearRoute,
      context: state.context
    }),
    shallow
  )
  const addLifiTransactionToCache = useLifiMergedTransactionCacheStore(
    state => state.addTransaction
  )

  const isTransferAllowed = useLatest(useIsTransferAllowed())

  const { setAmount, setAmount2 } = useSetInputAmount()

  const latestDestinationAddress = useLatest(destinationAddress)

  const [dialogProps, openDialog] = useDialog2()

  const [tokenImportDialogProps] = useDialog()

  const openTokenImportDialog = useTokenImportDialogStore(
    state => state.openDialog
  )

  const isCustomDestinationTransfer = !!latestDestinationAddress.current

  const {
    updateEthParentBalance,
    updateErc20ParentBalances,
    updateEthChildBalance
  } = useBalances()

  const { destinationAddressError } = useDestinationAddressError()

  const isBatchTransfer = isBatchTransferSupported && Number(amount2) > 0

  const { handleError } = useError()

  const switchToTransactionHistoryTab = useCallback(
    () =>
      setQueryParams({
        tab: tabToIndex[TabParamEnum.TX_HISTORY]
      }),
    [setQueryParams]
  )

  useEffect(() => {
    if (importTokenModalStatus !== ImportTokenModalStatus.IDLE) {
      return
    }

    openTokenImportDialog()
  }, [importTokenModalStatus, openTokenImportDialog])

  function closeWithResetTokenImportDialog() {
    setSelectedToken(null)
    setImportTokenModalStatus(ImportTokenModalStatus.CLOSED)
    tokenImportDialogProps.onClose(false)
  }

  function clearAmountInput() {
    // clear amount input on transfer panel
    setAmount('')
    setAmount2('')
  }

  const isTokenAlreadyImported = useMemo(() => {
    if (typeof tokenFromSearchParams === 'undefined') {
      return true
    }

    if (isTokenNativeUSDC(tokenFromSearchParams)) {
      return true
    }

    if (addressesEqual(tokenFromSearchParams, constants.AddressZero)) {
      return true
    }

    if (isLoadingTokenLists) {
      return undefined
    }

    // only show import token dialog if the token is not part of the list
    // otherwise we show a loader in the TokenButton
    if (!tokensFromLists) {
      return undefined
    }

    if (!tokensFromUser) {
      return undefined
    }

    return (
      typeof tokensFromLists[tokenFromSearchParams] !== 'undefined' ||
      typeof tokensFromUser[tokenFromSearchParams] !== 'undefined'
    )
  }, [
    isLoadingTokenLists,
    tokenFromSearchParams,
    tokensFromLists,
    tokensFromUser
  ])

  const isBridgingANewStandardToken = useMemo(() => {
    const isUnbridgedToken =
      selectedToken !== null && typeof selectedToken.l2Address === 'undefined'

    return isDepositMode && isUnbridgedToken
  }, [isDepositMode, selectedToken])

  const areSenderAndCustomDestinationAddressesEqual = useMemo(
    () => addressesEqual(destinationAddress, walletAddress),
    [destinationAddress, walletAddress]
  )

  async function depositToken() {
    if (!selectedToken) {
      throw new Error('Invalid app state: no selected token')
    }

    // Check if we need to show `TokenDepositCheckDialog` for first-time bridging
    const dialogType = getDialogType()

    if (dialogType) {
      const confirmed = await confirmDialog(dialogType)

      if (confirmed) {
        return transfer()
      }
    } else {
      return transfer()
    }
  }

  const { current: amountBigNumber } = useLatest(useAmountBigNumber())

  const confirmDialog = async (dialogType: DialogType) => {
    const waitForInput = openDialog(dialogType)
    const [confirmed] = await waitForInput()
    return confirmed
  }

  const showDelayInSmartContractTransaction = () => {
    // a custom 3 second delay to show a tooltip after SC transaction goes through
    // to give a visual feedback to the user that something happened
    setTimeout(() => {
      setShowSmartContractWalletTooltip(true)
    }, 3000)
    return true
  }

  function getDialogType(): TokenDepositCheckDialogType | null {
    if (isBridgingANewStandardToken) {
      return 'deposit_token_new_token'
    }

    const isUserAddedToken =
      selectedToken &&
      selectedToken?.listIds.size === 0 &&
      typeof selectedToken.l2Address === 'undefined'

    return isUserAddedToken ? 'deposit_token_user_added_token' : null
  }

  const firstTimeTokenBridgingConfirmation = async () => {
    // Check if we need to show `TokenDepositCheckDialog` for first-time bridging
    const dialogType = getDialogType()
    if (dialogType) {
      const confirmed = await confirmDialog(dialogType)
      return confirmed
    }

    // else pass the check
    return true
  }

  const confirmWithdrawal = async () => {
    const waitForInput = openDialog('withdraw')
    const [confirmed] = await waitForInput()
    return confirmed
  }

  // SC wallet transfer requests are sent immediately, delay it to give user an impression of a tx sent
  const showDelayedSmartContractTxRequest = () =>
    setTimeout(() => {
      setTransferring(false)
      setShowSmartContractWalletTooltip(true)
    }, 3000)

  const confirmCustomDestinationAddress = async () => {
    // confirm if the user is certain about the custom destination address, especially if it matches the connected SCW address.
    // this ensures that user funds do not end up in the destination chain's address that matches their source-chain wallet address, which they may not control.
    if (isSmartContractWallet && areSenderAndCustomDestinationAddressesEqual) {
      return confirmDialog('scw_custom_destination_address')
    }

    return true
  }

  const stepExecutor: UiDriverStepExecutor = async (context, step) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(step)
    }

    if (step.type === 'return') {
      throw Error(
        `[stepExecutor] "return" step should be handled outside the executor`
      )
    }

    switch (step.type) {
      case 'start': {
        setTransferring(true)
        return
      }

      case 'dialog': {
        return confirmDialog(step.payload)
      }

      case 'scw_tooltip': {
        showDelayedSmartContractTxRequest()
        return
      }

      case 'tx_ethers': {
        try {
          const tx = await signer!.sendTransaction(step.payload.txRequest)
          const txReceipt = await tx.wait()

          return { data: txReceipt }
        } catch (error) {
          // capture error and show toast for anything that's not user rejecting error
          if (!isUserRejectedError(error)) {
            handleError({
              error,
              label: step.payload.txRequestLabel,
              category: 'transaction_signing'
            })

            errorToast(`${(error as Error)?.message ?? error}`)
          }

          return { error: error as unknown as Error }
        }
      }
    }
  }

  const transferCctp = async () => {
    if (!selectedToken) {
      return
    }
    if (!walletAddress) {
      throw new Error(`walletAddress is undefined`)
    }
    if (!signer) {
      throw new Error(signerUndefinedError)
    }
    if (!isTransferAllowed) {
      throw new Error(transferNotAllowedError)
    }

    const destinationAddress = latestDestinationAddress.current

    try {
      const { sourceChainProvider, destinationChainProvider, sourceChain } =
        latestNetworks.current

      const cctpTransferStarter = new CctpTransferStarter({
        sourceChainProvider,
        destinationChainProvider
      })

      const returnEarly = await drive(stepGeneratorForCctp, stepExecutor, {
        amountBigNumber,
        isDepositMode,
        isSmartContractWallet,
        walletAddress,
        destinationAddress,
        transferStarter: cctpTransferStarter
      })

      // this is only necessary while we are migrating to the ui driver
      // so we can know when to stop the execution of the rest of the function
      //
      // after we are done, we can change the return type of `drive` to `void`
      if (returnEarly) {
        return
      }

      let depositForBurnTx

      try {
        if (isSmartContractWallet) {
          showDelayedSmartContractTxRequest()
        }
        const transfer = await cctpTransferStarter.transfer({
          amount: amountBigNumber,
          signer,
          destinationAddress,
          wagmiConfig
        })
        depositForBurnTx = transfer.sourceChainTransaction
      } catch (error) {
        if (isUserRejectedError(error)) {
          return
        }
        handleError({
          error,
          label: 'cctp_transfer',
          category: 'transaction_signing'
        })
        errorToast(
          `USDC ${
            isDepositMode ? 'Deposit' : 'Withdrawal'
          } transaction failed: ${(error as Error)?.message ?? error}`
        )
      }

      const childChainName = getNetworkName(childChain.id)

      if (!depositForBurnTx) {
        return
      }

      trackEvent(isDepositMode ? 'CCTP Deposit' : 'CCTP Withdrawal', {
        accountType: isSmartContractWallet ? 'Smart Contract' : 'EOA',
        network: childChainName,
        amount: Number(amount),
        complete: false,
        version: 2
      })

      const newTransfer: MergedTransaction = {
        txId: depositForBurnTx.hash,
        asset: 'USDC',
        assetType: AssetType.ERC20,
        blockNum: null,
        createdAt: dayjs().valueOf(),
        direction: isDepositMode ? 'deposit' : 'withdraw',
        isWithdrawal: !isDepositMode,
        resolvedAt: null,
        status: 'pending',
        uniqueId: null,
        value: amount,
        depositStatus: DepositStatus.CCTP_DEFAULT_STATE,
        destination: destinationAddress ?? walletAddress,
        sender: walletAddress,
        isCctp: true,
        tokenAddress: getUsdcTokenAddressFromSourceChainId(sourceChain.id),
        cctpData: {
          sourceChainId: sourceChain.id,
          attestationHash: null,
          messageBytes: null,
          receiveMessageTransactionHash: null,
          receiveMessageTimestamp: null
        },
        parentChainId: parentChain.id,
        childChainId: childChain.id,
        sourceChainId: networks.sourceChain.id,
        destinationChainId: networks.destinationChain.id
      }

      addPendingTransaction(newTransfer)
      switchToTransactionHistoryTab()
      setTransferring(false)
      clearAmountInput()
      clearRoute()
    } catch (e) {
    } finally {
      setTransferring(false)
    }
  }

  const transferLifi = async () => {
    try {
      if (!signer) {
        throw new Error(signerUndefinedError)
      }
      if (!isTransferAllowed) {
        throw new Error(transferNotAllowedError)
      }
      if (!context) {
        return
      }

      setTransferring(true)

      /**
       * If the amount received is less than 90% of the sent amount, we show a warning dialog
       * We multiply by 100 before dividing to avoid BigNumber stripping the value to 0
       */
      const { fromAmountUsd, toAmountUsd } = getAmountToPay(context)
      const { lossPercentage } = getAmountLoss({
        fromAmount: fromAmountUsd,
        toAmount: toAmountUsd
      })

      if (lossPercentage > 10) {
        const confirmation = await confirmDialog('high_slippage_warning')
        if (!confirmation) return
      }

      if (!(await confirmCustomDestinationAddress())) {
        return
      }

      const { sourceChainProvider, destinationChainProvider } = networks

      const tokenOverrides = getTokenOverride({
        fromToken: selectedToken?.address,
        sourceChainId: networks.sourceChain.id,
        destinationChainId: networks.destinationChain.id
      })

      const { transactionRequest } = await getStepTransaction(context.step)
      if (!isValidTransactionRequest(transactionRequest)) {
        return
      }

      const lifiTransferStarter = new LifiTransferStarter({
        destinationChainProvider,
        sourceChainProvider,
        destinationChainErc20Address: tokenOverrides.destination?.address,
        sourceChainErc20Address: tokenOverrides.source?.address,
        lifiData: {
          ...context,
          transactionRequest
        }
      })

      // Check for allowance
      if (
        await lifiTransferStarter.requiresTokenApproval({
          amount: amountBigNumber,
          owner: await signer.getAddress()
        })
      ) {
        const userConfirmation = await confirmDialog('approve_token')
        if (!userConfirmation) return false

        if (isSmartContractWallet) {
          showDelayedSmartContractTxRequest()
        }

        try {
          const tx = await lifiTransferStarter.approveToken({
            signer,
            amount: amountBigNumber
          })
          if (tx) await tx.wait()
        } catch (error) {
          if (isUserRejectedError(error)) {
            return
          }
          handleError({
            error,
            label: 'lifi_approve_token',
            category: 'token_approval'
          })
          errorToast(
            `Lifi token approval transaction failed: ${
              (error as Error)?.message ?? error
            }`
          )
          return
        }
      }

      if (isSmartContractWallet) {
        showDelayedSmartContractTxRequest()
      }

      const transfer = await lifiTransferStarter.transfer({
        amount: amountBigNumber,
        signer,
        destinationAddress,
        wagmiConfig
      })

      trackEvent('Lifi Transfer', {
        tokenSymbol: selectedToken?.symbol || 'ETH',
        assetType: selectedToken ? AssetType.ERC20 : AssetType.ETH,
        accountType: isSmartContractWallet ? 'Smart Contract' : 'EOA',
        network: getNetworkName(networks.sourceChain.id),
        amount: Number(amount),
        sourceChain: getNetworkName(networks.sourceChain.id),
        destinationChain: getNetworkName(networks.destinationChain.id)
      })

      if (isSmartContractWallet) {
        // show the warning in case of SCW since we cannot show Lifi tx history for SCW
        switchToTransactionHistoryTab()
        setTimeout(() => {
          highlightTransactionHistoryDisclaimer()
        }, 100)
      } else {
        const assetType =
          !selectedToken ||
          (selectedToken &&
            addressesEqual(selectedToken.address, constants.AddressZero))
            ? AssetType.ETH
            : AssetType.ERC20

        const newTransfer: LifiMergedTransaction = {
          txId: transfer.sourceChainTransaction.hash,
          asset: selectedToken?.symbol || 'ETH',
          assetType,
          blockNum: null,
          createdAt: dayjs().valueOf(),
          direction: isDepositMode ? 'deposit' : 'withdraw',
          isWithdrawal: !isDepositMode,
          resolvedAt: null,
          status: WithdrawalStatus.UNCONFIRMED,
          destinationStatus: WithdrawalStatus.UNCONFIRMED,
          uniqueId: null,
          value: amount,
          depositStatus: DepositStatus.LIFI_DEFAULT_STATE,
          destination: destinationAddress ?? walletAddress,
          sender: walletAddress,
          isLifi: true,
          tokenAddress: selectedToken?.address || constants.AddressZero,
          parentChainId: parentChain.id,
          childChainId: childChain.id,
          sourceChainId: networks.sourceChain.id,
          destinationChainId: networks.destinationChain.id,
          toolDetails: context.toolDetails,
          durationMs: context.durationMs,
          fromAmount: context.fromAmount,
          toAmount: context.toAmount,
          destinationTxId: null,
          transactionRequest
        }
        addPendingTransaction(newTransfer)
        addLifiTransactionToCache(newTransfer)
        switchToTransactionHistoryTab()
      }

      clearAmountInput()
      clearRoute()
    } catch (error) {
      if (isUserRejectedError(error)) {
        return
      }

      handleError({
        error,
        label: 'lifi_transfer',
        category: 'token_transfer'
      })
      errorToast(
        `Lifi withdrawal transaction failed: ${
          (error as Error)?.message ?? error
        }`
      )
    } finally {
      setTransferring(false)
    }
  }

  const transferOft = async () => {
    if (!selectedToken) {
      return
    }
    if (!signer) {
      throw new Error(signerUndefinedError)
    }
    if (!isTransferAllowed) {
      throw new Error(transferNotAllowedError)
    }

    setTransferring(true)

    try {
      const { sourceChainProvider, destinationChainProvider } =
        latestNetworks.current

      if (!(await confirmCustomDestinationAddress())) {
        return
      }

      const oftTransferStarter = new OftV2TransferStarter({
        sourceChainProvider,
        sourceChainErc20Address: isDepositMode
          ? selectedToken.address
          : selectedToken?.l2Address,
        destinationChainProvider
      })

      const isTokenApprovalRequired =
        await oftTransferStarter.requiresTokenApproval({
          amount: amountBigNumber,
          owner: await signer.getAddress()
        })

      if (isTokenApprovalRequired) {
        const userConfirmation = await confirmDialog('approve_token')
        if (!userConfirmation) return false

        if (isSmartContractWallet) {
          showDelayedSmartContractTxRequest()
        }

        try {
          const tx = await oftTransferStarter.approveToken({
            signer,
            amount: amountBigNumber
          })
          await tx.wait()
        } catch (error) {
          if (isUserRejectedError(error)) {
            return
          }
          handleError({
            error,
            label: 'oft_approve_token',
            category: 'token_approval'
          })
          errorToast(
            `OFT token approval transaction failed: ${
              (error as Error)?.message ?? error
            }`
          )
          return
        }
      }

      if (isSmartContractWallet) {
        showDelayedSmartContractTxRequest()
      }

      const transfer = await oftTransferStarter.transfer({
        amount: amountBigNumber,
        signer,
        destinationAddress,
        wagmiConfig
      })

      trackEvent('OFT Transfer', {
        tokenSymbol: selectedToken.symbol,
        assetType: 'ERC-20',
        accountType: isSmartContractWallet ? 'Smart Contract' : 'EOA',
        network: getNetworkName(networks.sourceChain.id),
        amount: Number(amount),
        sourceChain: getNetworkName(networks.sourceChain.id),
        destinationChain: getNetworkName(networks.destinationChain.id)
      })

      switchToTransactionHistoryTab()
      clearAmountInput()

      if (isSmartContractWallet) {
        // show the warning in case of SCW since we don't cannot show OFT tx history
        setTimeout(() => {
          highlightTransactionHistoryDisclaimer()
        }, 100)
      } else {
        // for EOA, show the transaction in tx history
        addPendingTransaction({
          isOft: true,
          isCctp: false,
          sender: walletAddress,
          direction: isDepositMode ? 'deposit' : 'withdraw',
          status: 'pending',
          createdAt: dayjs().valueOf(),
          resolvedAt: null,
          txId: transfer.sourceChainTransaction.hash.toLowerCase(),
          assetType: AssetType.ERC20,
          uniqueId: null,
          isWithdrawal: !isDepositMode,
          blockNum: null,
          childChainId: childChain.id,
          parentChainId: parentChain.id,
          sourceChainId: networks.sourceChain.id,
          destinationChainId: networks.destinationChain.id,
          asset: selectedToken.symbol,
          value: amount,
          tokenAddress: selectedToken.address
        })
      }

      clearRoute()
    } catch (error) {
      if (isUserRejectedError(error)) {
        return
      }
      handleError({
        error,
        label: 'oft_transfer',
        category: 'transaction_signing'
      })
      console.error(error)
      errorToast(
        `OFT ${isDepositMode ? 'Deposit' : 'Withdrawal'} transaction failed: ${
          (error as Error)?.message ?? error
        }`
      )
    } finally {
      setTransferring(false)
    }
  }

  const transfer = async () => {
    const sourceChainId = latestNetworks.current.sourceChain.id

    if (!isTransferAllowed) {
      throw new Error(transferNotAllowedError)
    }

    if (!signer) {
      throw new Error(signerUndefinedError)
    }

    // SC Teleport transfers aren't enabled yet. Safety check, shouldn't be able to get here.
    if (isSmartContractWallet && isTeleportMode) {
      console.error(
        getSmartContractWalletTeleportTransfersNotSupportedErrorMessage()
      )
      return
    }

    const childChainName = getNetworkName(childChain.id)

    setTransferring(true)

    try {
      const warningToken =
        selectedToken && warningTokens[selectedToken.address.toLowerCase()]
      if (warningToken) {
        const description = getWarningTokenDescription(warningToken.type)
        warningToast(
          `${selectedToken?.address} is ${description}; it will likely have unusual behavior when deployed as as standard token to Arbitrum. It is not recommended that you deploy it. (See ${DOCS_DOMAIN}/for-devs/concepts/token-bridge/token-bridge-erc20 for more info.)`
        )
        return
      }

      const destinationChainId = latestNetworks.current.destinationChain.id

      const sourceChainErc20Address = isDepositMode
        ? selectedToken?.address
        : selectedToken?.l2Address

      const destinationChainErc20Address = isDepositMode
        ? selectedToken?.l2Address
        : selectedToken?.address

      const bridgeTransferStarter = BridgeTransferStarterFactory.create({
        sourceChainId,
        sourceChainErc20Address,
        destinationChainId,
        destinationChainErc20Address
      })

      const { isWithdrawal, isDeposit } = getBridgeTransferProperties({
        sourceChainId,
        sourceChainErc20Address,
        destinationChainId
      })

      if (isDeposit && isTokenNativeUSDC(selectedToken?.address)) {
        const depositConfirmation = await confirmDialog('confirm_usdc_deposit')
        if (!depositConfirmation) return
      }

      if (isWithdrawal && selectedToken && !sourceChainErc20Address) {
        /*
        just a fail-safe - since our types allow for an optional `selectedToken?.l2Address`, we can theoretically end up with a case
        where user is trying to make an ERC-20 withdrawal but passing `sourceChainErc20Address` as undefined, ending up with
        the SDK to initialize wrongly and make an ETH withdrawal instead. To summarize:
        - if it's a withdrawal
        - if a token is selected
        - but the token's address on the child chain is not found (ie. sourceChainErc20Address)
      */
        throw Error(
          'Source chain token address not found for ERC-20 withdrawal.'
        )
      }

      if (destinationAddressError) {
        console.error(destinationAddressError)
        return
      }

      const destinationAddress = latestDestinationAddress.current

      if (!(await confirmCustomDestinationAddress())) {
        return
      }

      const isCustomNativeTokenAmount2 =
        nativeCurrency.isCustom &&
        isBatchTransferSupported &&
        Number(amount2) > 0

      const isNativeCurrencyApprovalRequired =
        await bridgeTransferStarter.requiresNativeCurrencyApproval({
          signer,
          amount: amountBigNumber,
          destinationAddress,
          options: {
            approvalAmountIncrease: isCustomNativeTokenAmount2
              ? utils.parseUnits(amount2, nativeCurrencyDecimalsOnSourceChain)
              : undefined
          }
        })

      if (isNativeCurrencyApprovalRequired) {
        // show native currency approval dialog
        const userConfirmation = await confirmDialog('approve_custom_fee_token')
        if (!userConfirmation) return false

        const approvalTx = await bridgeTransferStarter.approveNativeCurrency({
          signer,
          amount: amountBigNumber,
          destinationAddress,
          options: {
            approvalAmountIncrease: isCustomNativeTokenAmount2
              ? utils.parseUnits(amount2, nativeCurrencyDecimalsOnSourceChain)
              : undefined
          }
        })

        if (approvalTx) {
          await approvalTx.wait()
        }
      }

      // checks for the selected token
      if (selectedToken) {
        const tokenAddress = selectedToken.address

        // is selected token deployed on parent-chain?
        if (!tokenAddress) Error('Token not deployed on source chain.')

        // warning token handling
        const warningToken =
          selectedToken && warningTokens[selectedToken.address.toLowerCase()]
        if (warningToken) {
          const description = getWarningTokenDescription(warningToken.type)
          warningToast(
            `${selectedToken?.address} is ${description}; it will likely have unusual behavior when deployed as as standard token to Arbitrum. It is not recommended that you deploy it. (See ${DOCS_DOMAIN}/for-devs/concepts/token-bridge/token-bridge-erc20 for more info.)`
          )
          return
        }

        // token suspension handling
        const isTokenSuspended = !(await isGatewayRegistered({
          erc20ParentChainAddress: selectedToken.address,
          parentChainProvider,
          childChainProvider
        }))
        if (isTokenSuspended) {
          warningToast(
            'Depositing is currently suspended for this token as a new gateway is being registered. Please try again later and contact support if this issue persists.'
          )
          return
        }

        // if token is being bridged for first time, it will need to be registered in gateway
        const userConfirmationForFirstTimeTokenBridging =
          await firstTimeTokenBridgingConfirmation()
        if (!userConfirmationForFirstTimeTokenBridging) {
          throw Error('User declined bridging the token for the first time')
        }
      }

      // if withdrawal (and not smart-contract-wallet), confirm from user about the delays involved
      if (isWithdrawal && !isSmartContractWallet) {
        const withdrawalConfirmation = await confirmWithdrawal()
        if (!withdrawalConfirmation) return false
      }

      // token approval
      if (selectedToken) {
        const isTokenApprovalRequired =
          await bridgeTransferStarter.requiresTokenApproval({
            amount: amountBigNumber,
            owner: await signer.getAddress(),
            destinationAddress
          })
        if (isTokenApprovalRequired) {
          const userConfirmation = await confirmDialog('approve_token')
          if (!userConfirmation) return false

          if (isSmartContractWallet && isWithdrawal) {
            showDelayInSmartContractTransaction()
          }
          const approvalTx = await bridgeTransferStarter.approveToken({
            signer,
            amount: amountBigNumber
          })

          if (approvalTx) {
            await approvalTx.wait()
          }
        }
      }

      // show a delay in case of SCW because tx is executed in an external app
      if (isSmartContractWallet) {
        showDelayInSmartContractTransaction()

        trackEvent(
          isTeleportMode ? 'Teleport' : isDepositMode ? 'Deposit' : 'Withdraw',
          {
            tokenSymbol: selectedToken?.symbol,
            assetType: 'ERC-20',
            accountType: 'Smart Contract',
            network: childChainName,
            amount: Number(amount),
            amount2: isBatchTransfer ? Number(amount2) : undefined
          }
        )
      }

      const overrides: TransferOverrides = {}

      if (isBatchTransfer) {
        // when sending additional ETH with ERC-20, we add the additional ETH value as maxSubmissionCost
        const gasEstimates = (await bridgeTransferStarter.transferEstimateGas({
          amount: amountBigNumber,
          from: await signer.getAddress(),
          destinationAddress
        })) as DepositGasEstimates

        if (!gasEstimates.estimatedChildChainSubmissionCost) {
          errorToast('Failed to estimate deposit maxSubmissionCost')
          throw 'Failed to estimate deposit maxSubmissionCost'
        }

        overrides.maxSubmissionCost = utils
          // we are not scaling these to native decimals because arbitrum-sdk does it for us
          .parseEther(amount2)
          .add(gasEstimates.estimatedChildChainSubmissionCost)
        overrides.excessFeeRefundAddress = destinationAddress
      }

      // finally, call the transfer function
      const transfer = await bridgeTransferStarter.transfer({
        amount: amountBigNumber,
        signer,
        destinationAddress,
        overrides: Object.keys(overrides).length > 0 ? overrides : undefined
      })

      // transaction submitted callback
      onTxSubmit(transfer)
    } catch (error) {
      handleError({
        error,
        label: 'arbitrum_transfer',
        category: 'transaction_signing',
        additionalData: selectedToken
          ? {
              erc20_address_on_parent_chain: selectedToken.address,
              transfer_type: 'token'
            }
          : { transfer_type: 'native currency' }
      })
    } finally {
      setTransferring(false)
    }
  }

  const onTxSubmit = async (bridgeTransfer: BridgeTransfer) => {
    if (!walletAddress) return // at this point, walletAddress will always be defined, we just have this to avoid TS checks in this function

    const destinationAddress = latestDestinationAddress.current

    if (!isSmartContractWallet) {
      trackEvent(
        isTeleportMode ? 'Teleport' : isDepositMode ? 'Deposit' : 'Withdraw',
        {
          tokenSymbol: selectedToken?.symbol,
          assetType: selectedToken ? 'ERC-20' : 'ETH',
          accountType: 'EOA',
          network: getNetworkName(childChain.id),
          amount: Number(amount),
          amount2: isBatchTransfer ? Number(amount2) : undefined,
          isCustomDestinationTransfer,
          parentChainErc20Address: selectedToken?.address
        }
      )
    }

    const { sourceChainTransaction } = bridgeTransfer

    const timestampCreated = String(normalizeTimestamp(Date.now()))

    const { isOrbitChain: isSourceOrbitChain } = isNetwork(
      latestNetworks.current.sourceChain.id
    )

    // only scale for native tokens, and
    // only scale if sent from Orbit, because it's always 18 decimals there but the UI needs scaled amount
    const scaledAmount = scaleFrom18DecimalsToNativeTokenDecimals({
      amount: amountBigNumber,
      decimals: nativeCurrency.decimals
    })

    const isNativeTokenWithdrawalFromOrbit =
      !selectedToken && isSourceOrbitChain

    const txHistoryCompatibleObject = convertBridgeSdkToMergedTransaction({
      bridgeTransfer,
      parentChainId: parentChain.id,
      childChainId: childChain.id,
      selectedToken,
      walletAddress,
      destinationAddress,
      nativeCurrency,
      amount: isNativeTokenWithdrawalFromOrbit ? scaledAmount : amountBigNumber,
      amount2: isBatchTransfer ? utils.parseEther(amount2) : undefined,
      timestampCreated
    })

    // add transaction to the transaction history
    addPendingTransaction(txHistoryCompatibleObject)

    // if deposit, add to local cache
    if (isDepositMode) {
      addDepositToCache(
        convertBridgeSdkToPendingDepositTransaction({
          bridgeTransfer,
          parentChainId: parentChain.id,
          childChainId: childChain.id,
          selectedToken,
          walletAddress,
          destinationAddress,
          nativeCurrency,
          amount: isNativeTokenWithdrawalFromOrbit
            ? scaledAmount
            : amountBigNumber,
          amount2: isBatchTransfer ? utils.parseEther(amount2) : undefined,
          timestampCreated
        })
      )
    }

    if (embedMode) {
      openDialog('widget_transaction_history')
    } else {
      switchToTransactionHistoryTab()
    }

    setTransferring(false)
    clearRoute()
    clearAmountInput()

    await (sourceChainTransaction as TransactionResponse).wait()

    // tx confirmed, update balances
    await Promise.all([updateEthParentBalance(), updateEthChildBalance()])

    if (selectedToken) {
      token.updateTokenData(selectedToken.address)
    }

    if (nativeCurrency.isCustom) {
      await updateErc20ParentBalances([nativeCurrency.address])
    }
  }

  const trackTransferButtonClick = useCallback(() => {
    trackEvent('Transfer Button Click', {
      type: isTeleportMode
        ? 'Teleport'
        : isDepositMode
        ? 'Deposit'
        : 'Withdrawal',
      selectedRoute,
      tokenSymbol: selectedToken?.symbol,
      assetType: selectedToken ? 'ERC-20' : 'ETH',
      accountType: isSmartContractWallet ? 'Smart Contract' : 'EOA',
      network: childChain.name,
      amount: Number(amount),
      amount2: isBatchTransfer ? Number(amount2) : undefined,
      isCustomDestinationTransfer,
      parentChainErc20Address: selectedToken?.address
    })
  }, [
    amount,
    amount2,
    childChain.name,
    isBatchTransfer,
    isDepositMode,
    isSmartContractWallet,
    isTeleportMode,
    selectedToken,
    isCustomDestinationTransfer,
    selectedRoute
  ])

  const moveFundsButtonOnClick = async () => {
    const isConnectedToTheWrongChain =
      latestChain.current?.id !== latestNetworks.current.sourceChain.id

    const sourceChainId = latestNetworks.current.sourceChain.id
    const childChainName = getNetworkName(childChain.id)
    const isBatchTransfer = isBatchTransferSupported && Number(amount2) > 0

    trackTransferButtonClick()

    try {
      setTransferring(true)
      if (isConnectedToTheWrongChain) {
        trackEvent('Switch Network and Transfer', {
          type: isTeleportMode
            ? 'Teleport'
            : isDepositMode
            ? 'Deposit'
            : 'Withdrawal',
          tokenSymbol: selectedToken?.symbol,
          assetType: selectedToken ? 'ERC-20' : 'ETH',
          accountType: isSmartContractWallet ? 'Smart Contract' : 'EOA',
          network: childChainName,
          amount: Number(amount),
          amount2: isBatchTransfer ? Number(amount2) : undefined,
          version: 2
        })
        await switchChainAsync({ chainId: sourceChainId })
      }
    } catch (error) {
      if (isUserRejectedError(error)) {
        return
      }
      return networkConnectionWarningToast()
    } finally {
      setTransferring(false)
    }

    if (!isTransferAllowed) {
      return networkConnectionWarningToast()
    }

    if (selectedRoute == 'oftV2') {
      return transferOft()
    }
    if (selectedRoute === 'cctp') {
      return transferCctp()
    }
    if (isLifiRoute(selectedRoute)) {
      return transferLifi()
    }
    if (selectedRoute === 'arbitrum' && isDepositMode && selectedToken) {
      return depositToken()
    }
    return transfer()
  }

  if (embedMode) {
    return (
      <WidgetTransferPanel
        openDialog={openDialog}
        dialogProps={dialogProps}
        moveFundsButtonOnClick={moveFundsButtonOnClick}
        isTokenAlreadyImported={isTokenAlreadyImported}
        tokenFromSearchParams={tokenFromSearchParams}
        tokenImportDialogProps={tokenImportDialogProps}
        closeWithResetTokenImportDialog={closeWithResetTokenImportDialog}
      />
    )
  }

  return (
    <>
      <DialogWrapper {...dialogProps} />

      <div
        className={twMerge(
          'mb-7 flex flex-col gap-4 border-y border-white/30 bg-gray-1 p-4 shadow-[0px_4px_20px_rgba(0,0,0,0.2)]',
          'sm:rounded sm:border'
        )}
      >
        <TransferPanelMain />

        <ReceiveFundsHeader />

        <Routes />

        <ToSConfirmationCheckbox />

        {isConnected ? (
          <MoveFundsButton onClick={moveFundsButtonOnClick} />
        ) : (
          <ConnectWalletButton />
        )}

        {isTokenAlreadyImported === false && tokenFromSearchParams && (
          <TokenImportDialog
            {...tokenImportDialogProps}
            onClose={closeWithResetTokenImportDialog}
            tokenAddress={tokenFromSearchParams}
          />
        )}

        {showSmartContractWalletTooltip && (
          <Tippy
            placement="bottom-end"
            maxWidth="auto"
            onClickOutside={() => setShowSmartContractWalletTooltip(false)}
            theme="orange"
            visible={showSmartContractWalletTooltip}
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
