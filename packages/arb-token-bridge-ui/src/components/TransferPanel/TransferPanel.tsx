import dayjs from 'dayjs'
import { useState, useMemo, useCallback, useEffect } from 'react'
import Tippy from '@tippyjs/react'
import { utils } from 'ethers'
import { useLatest } from 'react-use'
import { useAccount, useConfig, usePublicClient, useWalletClient } from 'wagmi'
import { TransactionResponse } from '@ethersproject/providers'
import { twMerge } from 'tailwind-merge'
import { scaleFrom18DecimalsToNativeTokenDecimals } from '@arbitrum/sdk'
import { getAddress } from 'viem'
import { L2Network } from '@arbitrum/sdk'
import { type BridgeTransfer } from '@arbitrum/sdk-viem/dist/types'
import { type AssetType } from '@arbitrum/sdk-viem/dist/assetTypes'
import { type Provider } from '@ethersproject/providers'

import { useAppState } from '../../state'
import { getNetworkName, isNetwork } from '../../util/networks'
import {
  TokenDepositCheckDialog,
  TokenDepositCheckDialogType
} from './TokenDepositCheckDialog'
import { TokenImportDialog } from './TokenImportDialog'
import { useArbQueryParams } from '../../hooks/useArbQueryParams'
import { useDialog } from '../common/Dialog'
import { TokenApprovalDialog } from './TokenApprovalDialog'
import { WithdrawalConfirmationDialog } from './WithdrawalConfirmationDialog'
import { CustomDestinationAddressConfirmationDialog } from './CustomDestinationAddressConfirmationDialog'
import { TransferPanelSummary } from './TransferPanelSummary'
import { useAppContextActions } from '../App/AppContext'
import { trackEvent } from '../../util/AnalyticsUtils'
import { TransferPanelMain } from './TransferPanelMain'
import { useSwitchNetworkWithConfig } from '../../hooks/useSwitchNetworkWithConfig'
import { errorToast, warningToast } from '../common/atoms/Toast'
import { useAccountType } from '../../hooks/useAccountType'
import { GET_HELP_LINK } from '../../constants'
import { AdvancedSettings } from './AdvancedSettings'
import { USDCDepositConfirmationDialog } from './USDCDeposit/USDCDepositConfirmationDialog'
import { USDCWithdrawalConfirmationDialog } from './USDCWithdrawal/USDCWithdrawalConfirmationDialog'
import { CustomFeeTokenApprovalDialog } from './CustomFeeTokenApprovalDialog'
import { isUserRejectedError } from '../../util/isUserRejectedError'
import { getUsdcTokenAddressFromSourceChainId } from '../../state/cctpState'
import { DepositStatus, MergedTransaction } from '../../state/app/state'
import { useNativeCurrency } from '../../hooks/useNativeCurrency'
import {
  ImportTokenModalStatus,
  useTokenFromSearchParams
} from './TransferPanelUtils'
import { useImportTokenModal } from '../../hooks/TransferPanel/useImportTokenModal'
import { useTransactionHistory } from '../../hooks/useTransactionHistory'
import { useNetworks } from '../../hooks/useNetworks'
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship'
import { CctpTransferStarter } from '@/token-bridge-sdk/CctpTransferStarter'
import { BridgeTransferStarterFactory } from '@/token-bridge-sdk/BridgeTransferStarterFactory'
import { addDepositToCache } from '../TransactionHistory/helpers'
import {
  convertBridgeSdkToMergedTransaction,
  convertBridgeSdkToPendingDepositTransaction
} from './bridgeSdkConversionUtils'
import { useSetInputAmount } from '../../hooks/TransferPanel/useSetInputAmount'
import { useBalances } from '../../hooks/useBalances'
import { captureSentryErrorWithExtraData } from '../../util/SentryUtils'
import { useIsBatchTransferSupported } from '../../hooks/TransferPanel/useIsBatchTransferSupported'
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
import { useEthersSigner } from '../../util/wagmi/useEthersSigner'
import { useArbitrumClient } from '../../hooks/useArbitrumClient'

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
  const { tokenFromSearchParams, setTokenQueryParam } =
    useTokenFromSearchParams()

  const [tokenDepositCheckDialogType, setTokenDepositCheckDialogType] =
    useState<TokenDepositCheckDialogType>('new-token')
  const [importTokenModalStatus, setImportTokenModalStatus] =
    useState<ImportTokenModalStatus>(ImportTokenModalStatus.IDLE)
  const [showSmartContractWalletTooltip, setShowSmartContractWalletTooltip] =
    useState(false)

  const {
    app: {
      connectionState,
      selectedToken,
      arbTokenBridge: { token },
      warningTokens
    }
  } = useAppState()
  const { address: walletAddress, chain } = useAccount()
  const { switchChainAsync } = useSwitchNetworkWithConfig({
    isSwitchingNetworkBeforeTx: true
  })
  // do not use `useChainId` because it won't detect chains outside of our wagmi config
  const latestChain = useLatest(chain)
  const [networks] = useNetworks()
  const latestNetworks = useLatest(networks)
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
  const isBatchTransferSupported = useIsBatchTransferSupported()
  const nativeCurrencyDecimalsOnSourceChain =
    useSourceChainNativeCurrencyDecimals()

  const nativeCurrency = useNativeCurrency({ provider: childChainProvider })

  const { isSmartContractWallet } = useAccountType()

  const signer = useEthersSigner({ chainId: networks.sourceChain.id })
  const wagmiConfig = useConfig()

  const { setTransferring } = useAppContextActions()
  const { switchToTransactionHistoryTab } = useMainContentTabs()
  const { addPendingTransaction } = useTransactionHistory(walletAddress)

  const isCctpTransfer = useIsCctpTransfer()

  const isTransferAllowed = useLatest(useIsTransferAllowed())

  // Link the amount state directly to the amount in query params -  no need of useState
  // Both `amount` getter and setter will internally be using `useArbQueryParams` functions
  const [{ amount, amount2, destinationAddress }] = useArbQueryParams()

  const { setAmount, setAmount2 } = useSetInputAmount()

  const latestDestinationAddress = useLatest(destinationAddress)

  const [tokenImportDialogProps] = useDialog()
  const [tokenCheckDialogProps, openTokenCheckDialog] = useDialog()
  const [tokenApprovalDialogProps, openTokenApprovalDialog] = useDialog()
  const [customFeeTokenApprovalDialogProps, openCustomFeeTokenApprovalDialog] =
    useDialog()
  const [withdrawalConfirmationDialogProps, openWithdrawalConfirmationDialog] =
    useDialog()
  const [
    usdcWithdrawalConfirmationDialogProps,
    openUSDCWithdrawalConfirmationDialog
  ] = useDialog()
  const [
    usdcDepositConfirmationDialogProps,
    openUSDCDepositConfirmationDialog
  ] = useDialog()

  const [
    customDestinationAddressConfirmationDialogProps,
    openCustomDestinationAddressConfirmationDialog
  ] = useDialog()

  const isCustomDestinationTransfer = !!latestDestinationAddress.current

  const {
    updateEthParentBalance,
    updateErc20ParentBalances,
    updateEthChildBalance
  } = useBalances()

  const [isCctp, setIsCctp] = useState(false)

  const { destinationAddressError } = useDestinationAddressError()

  const [showProjectsListing, setShowProjectsListing] = useState(false)

  const isBatchTransfer = isBatchTransferSupported && Number(amount2) > 0

  useEffect(() => {
    // hide Project listing when networks are changed
    setShowProjectsListing(false)
  }, [childChain.id, parentChain.id])

  function closeWithResetTokenImportDialog() {
    setTokenQueryParam(undefined)
    setImportTokenModalStatus(ImportTokenModalStatus.CLOSED)
    tokenImportDialogProps.onClose(false)
  }

  function clearAmountInput() {
    // clear amount input on transfer panel
    setAmount('')
    setAmount2('')
  }

  useImportTokenModal({
    importTokenModalStatus,
    connectionState
  })

  const isBridgingANewStandardToken = useMemo(() => {
    const isUnbridgedToken =
      selectedToken !== null && typeof selectedToken.l2Address === 'undefined'

    return isDepositMode && isUnbridgedToken
  }, [isDepositMode, selectedToken])

  const areSenderAndCustomDestinationAddressesEqual = useMemo(() => {
    return (
      destinationAddress?.trim().toLowerCase() ===
      walletAddress?.trim().toLowerCase()
    )
  }, [destinationAddress, walletAddress])

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
        transfer()
      }
    } else {
      transfer()
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
    setIsCctp(true)
    const waitForInput = openTokenApprovalDialog()
    const [confirmed] = await waitForInput()
    return confirmed
  }

  const customFeeTokenApproval = async () => {
    const waitForInput = openCustomFeeTokenApprovalDialog()
    const [confirmed] = await waitForInput()
    return confirmed
  }

  const tokenAllowanceApproval = async () => {
    setIsCctp(false)
    const waitForInput = openTokenApprovalDialog()
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
    const waitForInput = openWithdrawalConfirmationDialog()
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
    const waitForInput = openCustomDestinationAddressConfirmationDialog()
    const [confirmed] = await waitForInput()
    return confirmed
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

    setTransferring(true)

    try {
      const { sourceChainProvider, destinationChainProvider, sourceChain } =
        networks

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
          destinationAddress,
          wagmiConfig
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
      setIsCctp(false)
    }
  }

  const publicClient = usePublicClient()
  const { data: walletClient, isLoading: isWalletLoading } = useWalletClient()
  const {
    address: account,
    isConnecting: isAccountConnecting,
    isConnected
  } = useAccount()

  const arbitrumClient = useArbitrumClient()

  const isWalletReady = useMemo(() => {
    return (
      isConnected && !!walletClient && !isWalletLoading && !isAccountConnecting
    )
  }, [isConnected, walletClient, isWalletLoading, isAccountConnecting])

  const transfer = async () => {
    console.log('[Debug] Transfer started', {
      publicClient: !!publicClient,
      walletClient: !!walletClient,
      isWalletLoading,
      isAccountConnecting,
      isConnected,
      isWalletReady,
      chain: latestChain.current?.id,
      sourceChainId: latestNetworks.current.sourceChain.id,
      amount: amountBigNumber.toString(),
      arbitrumClient: !!arbitrumClient
    })

    if (!isTransferAllowed) {
      console.log('[Debug] Transfer not allowed')
      throw new Error(transferNotAllowedError)
    }

    // Check if wallet is ready
    if (!isWalletReady) {
      if (isWalletLoading || isAccountConnecting) {
        console.log('[Debug] Wallet is still connecting...')
        throw new Error('Please wait, wallet is connecting...')
      }
      if (!isConnected || !walletClient) {
        console.log('[Debug] Wallet not connected')
        throw new Error('Please connect your wallet')
      }
    }

    if (!publicClient) {
      console.log('[Debug] Public client undefined')
      throw new Error(signerUndefinedError)
    }

    if (!arbitrumClient) {
      console.log('[Debug] Arbitrum client not initialized')
      throw new Error('Arbitrum client not initialized')
    }

    setTransferring(true)

    try {
      // Ensure we're on the source chain
      const currentChainId = await walletClient.getChainId()
      const sourceChainId = latestNetworks.current.sourceChain.id

      console.log('[Debug] Chain check:', {
        currentChainId,
        sourceChainId,
        account,
        arbitrumClient: !!arbitrumClient
      })

      if (currentChainId !== sourceChainId) {
        console.log('[Debug] Switching to source chain')
        await walletClient.switchChain({ id: sourceChainId })
      }

      if (isDepositMode && !selectedToken) {
        if (!arbitrumClient?.parentWalletClient) {
          throw new Error('Parent wallet client not initialized')
        }

        const destAddress = destinationAddress
          ? getAddress(destinationAddress)
          : (account as `0x${string}`)

        const depositValue = BigInt(amountBigNumber.toString())

        console.log('[Debug] Starting ETH deposit with:', {
          amount: depositValue,
          from: account,
          to: destAddress,
          hasParentWalletClient: true
        })

        const tx = await arbitrumClient.parentWalletClient.depositEth({
          account: destAddress,
          amount: depositValue
        })

        // Convert the transaction to a BridgeTransfer format
        const bridgeTransfer: BridgeTransfer = {
          type: 'deposit-eth',
          status: 'pending',
          txHash: tx.hash,
          from: account as `0x${string}`,
          to: destAddress,
          value: depositValue,
          assetType: 'eth' as AssetType,
          direction: 'deposit',
          timestampMs: Date.now()
        }

        onTxSubmit(bridgeTransfer)
        return
      }

      // For other cases (tokens or withdrawals), use the existing bridge transfer logic
      const bridgeTransferStarter = await BridgeTransferStarterFactory.create(
        {
          sourceChainId: latestNetworks.current.sourceChain.id,
          sourceChainErc20Address: selectedToken?.address
            ? getAddress(selectedToken.address)
            : undefined,
          destinationChainId: latestNetworks.current.destinationChain.id,
          destinationChainErc20Address: selectedToken?.l2Address
            ? getAddress(selectedToken.l2Address)
            : undefined
        },
        {
          l1PublicClient: publicClient,
          l2PublicClient: publicClient,
          walletClient,
          l2Network: childChain as unknown as L2Network
        }
      )

      console.log('[Debug] BridgeTransferStarter created', {
        transferType: bridgeTransferStarter.transferType
      })

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

      // show a delay in case of SCW because tx is executed in an external app
      if (isSmartContractWallet) {
        showDelayInSmartContractTransaction()

        trackEvent(
          isTeleportMode ? 'Teleport' : isDepositMode ? 'Deposit' : 'Withdraw',
          {
            tokenSymbol: selectedToken?.symbol,
            assetType: 'ERC-20',
            accountType: 'Smart Contract',
            network: getNetworkName(childChain.id),
            amount: Number(amount),
            amount2: isBatchTransfer ? Number(amount2) : undefined
          }
        )
      }

      const overrides: any = {}

      if (isBatchTransfer) {
        // when sending additional ETH with ERC-20, we add the additional ETH value as maxSubmissionCost
        const gasEstimate = await bridgeTransferStarter.estimateGas({
          amount,
          destinationAddress: destinationAddress
            ? getAddress(destinationAddress)
            : undefined
        })

        overrides.maxSubmissionCost = utils
          // we are not scaling these to native decimals because arbitrum-sdk does it for us
          .parseEther(amount2)
          .add(gasEstimate)
        overrides.excessFeeRefundAddress = destinationAddress
          ? getAddress(destinationAddress)
          : undefined
      }

      console.log('[Debug] Calling transfer', {
        amount,
        destinationAddress: destinationAddress
          ? getAddress(destinationAddress)
          : undefined,
        overrides: Object.keys(overrides).length > 0 ? overrides : undefined,
        publicClient: !!publicClient,
        walletClient: !!walletClient
      })

      // finally, call the transfer function
      const { hash } = await bridgeTransferStarter.transfer({
        amount,
        destinationAddress: destinationAddress
          ? getAddress(destinationAddress)
          : undefined,
        overrides: Object.keys(overrides).length > 0 ? overrides : undefined
      })

      console.log('[Debug] Transfer successful', { hash })

      // transaction submitted callback
      const bridgeTransfer: BridgeTransfer = {
        transferType: bridgeTransferStarter.transferType,
        status: 'pending',
        sourceChainProvider: publicClient as unknown as Provider,
        destinationChainProvider: publicClient as unknown as Provider,
        sourceChainTransaction: { hash }
      }

      onTxSubmit(bridgeTransfer)
    } catch (error) {
      console.error('[Debug] Transfer failed', error)
      captureSentryErrorWithExtraData({
        error,
        originFunction: 'transfer',
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

        // Wait for the wallet client to update after chain switch
        let retries = 0
        const maxRetries = 5
        const retryDelay = 1000

        while (retries < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay))

          // Verify that we're now on the correct chain and have a wallet client
          if (latestChain.current?.id === sourceChainId && walletClient) {
            break
          }

          console.log('[Debug] Chain switch verification attempt', {
            attempt: retries + 1,
            currentChain: latestChain.current?.id,
            expectedChain: sourceChainId,
            hasWalletClient: !!walletClient
          })

          retries++

          if (retries === maxRetries) {
            console.log(
              '[Debug] Chain switch verification failed after retries',
              {
                currentChain: latestChain.current?.id,
                expectedChain: sourceChainId,
                hasWalletClient: !!walletClient
              }
            )
            setTransferring(false)
            return networkConnectionWarningToast()
          }
        }
      }

      if (!isTransferAllowed) {
        setTransferring(false)
        return networkConnectionWarningToast()
      }

      if (isCctpTransfer) {
        return transferCctp()
      }
      if (isDepositMode && selectedToken) {
        return depositToken()
      }
      return transfer()
    } catch (error) {
      if (isUserRejectedError(error)) {
        return
      }
      return networkConnectionWarningToast()
    } finally {
      // Only set transferring to false if we haven't started a transfer
      if (
        !isTransferAllowed ||
        isCctpTransfer ||
        (isDepositMode && selectedToken)
      ) {
        setTransferring(false)
      }
    }
  }

  return (
    <>
      <TokenApprovalDialog
        {...tokenApprovalDialogProps}
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

      <USDCWithdrawalConfirmationDialog
        {...usdcWithdrawalConfirmationDialogProps}
        amount={amount}
      />

      <USDCDepositConfirmationDialog
        {...usdcDepositConfirmationDialogProps}
        amount={amount}
      />

      <CustomDestinationAddressConfirmationDialog
        {...customDestinationAddressConfirmationDialogProps}
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
        <MoveFundsButton onClick={moveFundsButtonOnClick} />

        {typeof tokenFromSearchParams !== 'undefined' && (
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
