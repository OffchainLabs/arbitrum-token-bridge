import dayjs from 'dayjs'
import { useState, useMemo, useCallback, useEffect } from 'react'
import Tippy from '@tippyjs/react'
import { utils } from 'ethers'
import { useLatest } from 'react-use'
import { useAccount, useNetwork, useSigner } from 'wagmi'
import { TransactionResponse } from '@ethersproject/providers'
import { twMerge } from 'tailwind-merge'
import { scaleFrom18DecimalsToNativeTokenDecimals } from '@arbitrum/sdk'

import { useAppState } from '../../state'
import { getNetworkName, isNetwork } from '../../util/networks'
import {
  TokenDepositCheckDialog,
  TokenDepositCheckDialogType
} from './TokenDepositCheckDialog'
import {
  TokenImportDialog,
  useTokenImportDialogStore
} from './TokenImportDialog'
import { useArbQueryParams } from '../../hooks/useArbQueryParams'
import { useDialog } from '../common/Dialog'
import { TransferPanelSummary } from './TransferPanelSummary'
import { useAppContextActions } from '../App/AppContext'
import { trackEvent } from '../../util/AnalyticsUtils'
import { TransferPanelMain } from './TransferPanelMain'
import { isGatewayRegistered, isTokenNativeUSDC } from '../../util/TokenUtils'
import { useSwitchNetworkWithConfig } from '../../hooks/useSwitchNetworkWithConfig'
import { errorToast, warningToast } from '../common/atoms/Toast'
import { useAccountType } from '../../hooks/useAccountType'
import { DOCS_DOMAIN, GET_HELP_LINK } from '../../constants'
import { AdvancedSettings } from './AdvancedSettings'
import { USDCDepositConfirmationDialog } from './USDCDeposit/USDCDepositConfirmationDialog'
import { USDCWithdrawalConfirmationDialog } from './USDCWithdrawal/USDCWithdrawalConfirmationDialog'
import { isUserRejectedError } from '../../util/isUserRejectedError'
import { getUsdcTokenAddressFromSourceChainId } from '../../state/cctpState'
import { DepositStatus, MergedTransaction } from '../../state/app/state'
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
import { captureSentryErrorWithExtraData } from '../../util/SentryUtils'
import { useIsBatchTransferSupported } from '../../hooks/TransferPanel/useIsBatchTransferSupported'
import { useTokenLists } from '../../hooks/useTokenLists'
import { normalizeTimestamp } from '../../state/app/utils'
import { useDestinationAddressError } from './hooks/useDestinationAddressError'
import { useIsCctpTransfer } from './hooks/useIsCctpTransfer'
import { ExternalLink } from '../common/ExternalLink'
import { useIsTransferAllowed } from './hooks/useIsTransferAllowed'
import { MoveFundsButton } from './MoveFundsButton'
import { ProjectsListing } from '../common/ProjectsListing'
import { useAmountBigNumber } from './hooks/useAmountBigNumber'
import { useSourceChainNativeCurrencyDecimals } from '../../hooks/useSourceChainNativeCurrencyDecimals'
import { useMainContentTabs } from '../MainContent/MainContent'
import { useIsOftV2Transfer } from './hooks/useIsOftV2Transfer'
import { OftV2TransferStarter } from '../../token-bridge-sdk/OftV2TransferStarter'
import { highlightOftTransactionHistoryDisclaimer } from '../TransactionHistory/OftTransactionHistoryDisclaimer'
import { useDialog2, DialogWrapper } from '../common/Dialog2'
import { addressesEqual } from '../../util/AddressUtils'
import { drive, UiDriverStepExecutor } from '../../ui-driver/UiDriver'
import { stepGeneratorForCctp } from '../../ui-driver/UiDriverCctp'
import { ConnectWalletButton } from './ConnectWalletButton'

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
  const [{ token: tokenFromSearchParams }] = useArbQueryParams()
  const [tokenDepositCheckDialogType, setTokenDepositCheckDialogType] =
    useState<TokenDepositCheckDialogType>('new-token')
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
  const [selectedToken, setSelectedToken] = useSelectedToken()
  const { address: walletAddress, isConnected } = useAccount()
  const { switchNetworkAsync } = useSwitchNetworkWithConfig({
    isSwitchingNetworkBeforeTx: true
  })
  // do not use `useChainId` because it won't detect chains outside of our wagmi config
  const latestChain = useLatest(useNetwork())
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

  const { data: signer } = useSigner({
    chainId: networks.sourceChain.id
  })

  const { setTransferring } = useAppContextActions()
  const { switchToTransactionHistoryTab } = useMainContentTabs()
  const { addPendingTransaction } = useTransactionHistory(walletAddress)

  const isCctpTransfer = useIsCctpTransfer()

  const isOftTransfer = useIsOftV2Transfer()

  const isTransferAllowed = useLatest(useIsTransferAllowed())

  // Link the amount state directly to the amount in query params -  no need of useState
  // Both `amount` getter and setter will internally be using `useArbQueryParams` functions
  const [{ amount, amount2, destinationAddress }] = useArbQueryParams()

  const { setAmount, setAmount2 } = useSetInputAmount()

  const latestDestinationAddress = useLatest(destinationAddress)

  const [dialogProps, openDialog] = useDialog2()

  const [tokenImportDialogProps] = useDialog()
  const [tokenCheckDialogProps, openTokenCheckDialog] = useDialog()
  const [
    usdcWithdrawalConfirmationDialogProps,
    openUSDCWithdrawalConfirmationDialog
  ] = useDialog()
  const [
    usdcDepositConfirmationDialogProps,
    openUSDCDepositConfirmationDialog
  ] = useDialog()

  const { openDialog: openTokenImportDialog } = useTokenImportDialogStore()

  const isCustomDestinationTransfer = !!latestDestinationAddress.current

  const {
    updateEthParentBalance,
    updateErc20ParentBalances,
    updateEthChildBalance
  } = useBalances()

  const { destinationAddressError } = useDestinationAddressError()

  const [showProjectsListing, setShowProjectsListing] = useState(false)

  const isBatchTransfer = isBatchTransferSupported && Number(amount2) > 0

  useEffect(() => {
    // hide Project listing when networks are changed
    setShowProjectsListing(false)
  }, [childChain.id, parentChain.id])

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
      setTokenDepositCheckDialogType(dialogType)

      const waitForInput = openTokenCheckDialog()
      const [confirmed] = await waitForInput()

      if (confirmed) {
        return transfer()
      }
    } else {
      return transfer()
    }
  }

  const amountBigNumber = useAmountBigNumber()

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

  const tokenAllowanceApprovalCctp = async () => {
    const waitForInput = openDialog('approve_cctp_usdc')
    const [confirmed] = await waitForInput()
    return confirmed
  }

  const customFeeTokenApproval = async () => {
    const waitForInput = openDialog('approve_custom_fee_token')
    const [confirmed] = await waitForInput()
    return confirmed
  }

  const tokenAllowanceApproval = async () => {
    const waitForInput = openDialog('approve_token')
    const [confirmed] = await waitForInput()
    return confirmed
  }

  const showDelayInSmartContractTransaction = async () => {
    // a custom 3 second delay to show a tooltip after SC transaction goes through
    // to give a visual feedback to the user that something happened
    await setTimeout(() => {
      setShowSmartContractWalletTooltip(true)
    }, 3000)
    return true
  }

  function getDialogType(): TokenDepositCheckDialogType | null {
    if (isBridgingANewStandardToken) {
      return 'new-token'
    }

    const isUserAddedToken =
      selectedToken &&
      selectedToken?.listIds.size === 0 &&
      typeof selectedToken.l2Address === 'undefined'

    return isUserAddedToken ? 'user-added-token' : null
  }

  const firstTimeTokenBridgingConfirmation = async () => {
    // Check if we need to show `TokenDepositCheckDialog` for first-time bridging
    const dialogType = getDialogType()
    if (dialogType) {
      setTokenDepositCheckDialogType(dialogType)
      const waitForInput = openTokenCheckDialog()
      const [confirmed] = await waitForInput()
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

  const confirmCustomDestinationAddressForSCWallets = async () => {
    const waitForInput = openDialog('scw_custom_destination_address')
    const [confirmed] = await waitForInput()
    return confirmed
  }

  const stepExecutor: UiDriverStepExecutor = async step => {
    if (process.env.NODE_ENV === 'development') {
      console.log(step)
    }

    switch (step.type) {
      case 'start': {
        setTransferring(true)
        return
      }

      case 'return': {
        throw Error(
          `[stepExecutor] "return" step should be handled outside the executor`
        )
      }
    }
  }

  const transferCctp = async () => {
    if (!selectedToken) {
      return
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
        networks

      await drive(stepGeneratorForCctp, stepExecutor, {
        isDepositMode,
        isSmartContractWallet
      })

      // show confirmation popup before cctp transfer
      if (isDepositMode) {
        const depositConfirmation =
          await confirmUsdcDepositFromNormalOrCctpBridge()

        if (!depositConfirmation) return false

        // if user selects usdc.e, redirect to our canonical transfer function
        if (depositConfirmation === 'bridge-normal-usdce') {
          await depositToken()
          return
        }
      } else {
        const withdrawalConfirmation = await confirmUsdcWithdrawalForCctp()
        if (!withdrawalConfirmation) return
      }

      // confirm if the user is certain about the custom destination address, especially if it matches the connected SCW address.
      // this ensures that user funds do not end up in the destination chain's address that matches their source-chain wallet address, which they may not control.
      if (
        isSmartContractWallet &&
        areSenderAndCustomDestinationAddressesEqual
      ) {
        const confirmation = await confirmCustomDestinationAddressForSCWallets()
        if (!confirmation) return false
      }

      const cctpTransferStarter = new CctpTransferStarter({
        sourceChainProvider,
        destinationChainProvider
      })

      const isTokenApprovalRequired =
        await cctpTransferStarter.requiresTokenApproval({
          amount: amountBigNumber,
          signer
        })

      if (isTokenApprovalRequired) {
        const userConfirmation = await tokenAllowanceApprovalCctp()
        if (!userConfirmation) return false

        if (isSmartContractWallet) {
          showDelayedSmartContractTxRequest()
        }
        try {
          const tx = await cctpTransferStarter.approveToken({
            signer,
            amount: amountBigNumber
          })

          await tx.wait()
        } catch (error) {
          if (isUserRejectedError(error)) {
            return
          }
          captureSentryErrorWithExtraData({
            error,
            originFunction: 'cctpTransferStarter.approveToken'
          })
          errorToast(
            `USDC approval transaction failed: ${
              (error as Error)?.message ?? error
            }`
          )
          return
        }
      }

      let depositForBurnTx

      try {
        if (isSmartContractWallet) {
          showDelayedSmartContractTxRequest()
        }
        const transfer = await cctpTransferStarter.transfer({
          amount: amountBigNumber,
          signer,
          destinationAddress
        })
        depositForBurnTx = transfer.sourceChainTransaction
      } catch (error) {
        if (isUserRejectedError(error)) {
          return
        }
        captureSentryErrorWithExtraData({
          error,
          originFunction: 'cctpTransferStarter.transfer'
        })
        errorToast(
          `USDC ${
            isDepositMode ? 'Deposit' : 'Withdrawal'
          } transaction failed: ${(error as Error)?.message ?? error}`
        )
      }

      const childChainName = getNetworkName(childChain.id)

      if (isSmartContractWallet) {
        // For SCW, we assume that the transaction went through
        trackEvent(isDepositMode ? 'CCTP Deposit' : 'CCTP Withdrawal', {
          accountType: 'Smart Contract',
          network: childChainName,
          amount: Number(amount),
          complete: false,
          version: 2
        })

        return
      }

      if (!depositForBurnTx) {
        return
      }

      trackEvent(isDepositMode ? 'CCTP Deposit' : 'CCTP Withdrawal', {
        accountType: 'EOA',
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
    } catch (e) {
      //
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

    const destinationAddress = latestDestinationAddress.current

    setTransferring(true)

    try {
      const { sourceChainProvider, destinationChainProvider } = networks

      // confirm if the user is certain about the custom destination address for SCW
      if (
        isSmartContractWallet &&
        areSenderAndCustomDestinationAddressesEqual
      ) {
        const confirmation = await confirmCustomDestinationAddressForSCWallets()
        if (!confirmation) return false
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
          signer
        })

      if (isTokenApprovalRequired) {
        const userConfirmation = await tokenAllowanceApproval()
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
          captureSentryErrorWithExtraData({
            error,
            originFunction: 'oftTransferStarter.approveToken'
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
        destinationAddress
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
          highlightOftTransactionHistoryDisclaimer()
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
          txId: transfer.sourceChainTransaction.hash,
          assetType: AssetType.ERC20,
          uniqueId: null,
          isWithdrawal: false,
          blockNum: null,
          childChainId: isDepositMode
            ? networks.destinationChain.id
            : networks.sourceChain.id,
          parentChainId: isDepositMode
            ? networks.sourceChain.id
            : networks.destinationChain.id,
          sourceChainId: networks.sourceChain.id,
          destinationChainId: networks.destinationChain.id,
          asset: selectedToken.symbol,
          value: amount,
          tokenAddress: selectedToken.address
        })
      }
    } catch (error) {
      if (isUserRejectedError(error)) {
        return
      }
      captureSentryErrorWithExtraData({
        error,
        originFunction: 'oftTransferStarter.transfer'
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

      const bridgeTransferStarter = await BridgeTransferStarterFactory.create({
        sourceChainId,
        sourceChainErc20Address,
        destinationChainId,
        destinationChainErc20Address
      })

      const { isWithdrawal } = getBridgeTransferProperties({
        sourceChainId,
        sourceChainErc20Address,
        destinationChainId
      })

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

      // confirm if the user is certain about the custom destination address, especially if it matches the connected SCW address.
      // this ensures that user funds do not end up in the destination chain's address that matches their source-chain wallet address, which they may not control.
      if (
        isSmartContractWallet &&
        areSenderAndCustomDestinationAddressesEqual
      ) {
        const confirmation = await confirmCustomDestinationAddressForSCWallets()
        if (!confirmation) return false
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
        const userConfirmation = await customFeeTokenApproval()
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
            signer,
            destinationAddress
          })
        if (isTokenApprovalRequired) {
          const userConfirmation = await tokenAllowanceApproval()
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
          signer,
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
      captureSentryErrorWithExtraData({
        error,
        originFunction: 'bridgeTransferStarter.transfer',
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

    switchToTransactionHistoryTab()
    setTransferring(false)
    clearAmountInput()

    // for custom orbit pages, show Projects' listing after transfer
    if (isDepositMode && isNetwork(childChain.id).isOrbitChain) {
      setShowProjectsListing(true)
    }

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
      isCctpTransfer,
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
    isCctpTransfer,
    isDepositMode,
    isSmartContractWallet,
    isTeleportMode,
    selectedToken,
    isCustomDestinationTransfer
  ])

  const moveFundsButtonOnClick = async () => {
    const isConnectedToTheWrongChain =
      latestChain.current?.chain?.id !== latestNetworks.current.sourceChain.id

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
        await switchNetworkAsync?.(sourceChainId)
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

    if (isOftTransfer) {
      return transferOft()
    }
    if (isCctpTransfer) {
      return transferCctp()
    }
    if (isDepositMode && selectedToken) {
      return depositToken()
    }
    return transfer()
  }

  return (
    <>
      <DialogWrapper {...dialogProps} />

      <USDCWithdrawalConfirmationDialog
        {...usdcWithdrawalConfirmationDialogProps}
        amount={amount}
      />

      <USDCDepositConfirmationDialog
        {...usdcDepositConfirmationDialogProps}
        amount={amount}
      />

      <div
        className={twMerge(
          'mb-7 flex flex-col border-y border-white/30 bg-gray-1 p-4 shadow-[0px_4px_20px_rgba(0,0,0,0.2)]',
          'sm:rounded sm:border'
        )}
      >
        <TransferPanelMain />
        <AdvancedSettings />
        <TransferPanelSummary
          amount={parseFloat(amount)}
          token={selectedToken}
        />

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

        <TokenDepositCheckDialog
          {...tokenCheckDialogProps}
          type={tokenDepositCheckDialogType}
          symbol={selectedToken ? selectedToken.symbol : nativeCurrency.symbol}
        />

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

      {showProjectsListing && <ProjectsListing />}
    </>
  )
}
