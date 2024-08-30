import dayjs from 'dayjs'
import { useState, useMemo } from 'react'
import Tippy from '@tippyjs/react'
import { constants, utils } from 'ethers'
import { useLatest } from 'react-use'
import { useAccount, useChainId, useSigner } from 'wagmi'
import { TransactionResponse } from '@ethersproject/providers'
import { twMerge } from 'tailwind-merge'

import { useAppState } from '../../state'
import { getNetworkName, isNetwork } from '../../util/networks'
import { Button } from '../common/Button'
import {
  TokenDepositCheckDialog,
  TokenDepositCheckDialogType
} from './TokenDepositCheckDialog'
import { TokenImportDialog } from './TokenImportDialog'
import { useArbQueryParams } from '../../hooks/useArbQueryParams'
import { useDialog } from '../common/Dialog'
import { TokenApprovalDialog } from './TokenApprovalDialog'
import { WithdrawalConfirmationDialog } from './WithdrawalConfirmationDialog'
import { TransferPanelSummary } from './TransferPanelSummary'
import { useAppContextActions, useAppContextState } from '../App/AppContext'
import { trackEvent } from '../../util/AnalyticsUtils'
import { TransferPanelMain } from './TransferPanelMain'
import {
  isTokenArbitrumSepoliaNativeUSDC,
  isTokenArbitrumOneNativeUSDC,
  isTokenSepoliaUSDC,
  isTokenMainnetUSDC,
  isGatewayRegistered
} from '../../util/TokenUtils'
import { useSwitchNetworkWithConfig } from '../../hooks/useSwitchNetworkWithConfig'
import { useIsConnectedToArbitrum } from '../../hooks/useIsConnectedToArbitrum'
import { useIsConnectedToOrbitChain } from '../../hooks/useIsConnectedToOrbitChain'
import { errorToast, warningToast } from '../common/atoms/Toast'
import { ExternalLink } from '../common/ExternalLink'
import { useAccountType } from '../../hooks/useAccountType'
import { DOCS_DOMAIN, GET_HELP_LINK } from '../../constants'
import {
  AdvancedSettings,
  getDestinationAddressError,
  useDestinationAddressStore
} from './AdvancedSettings'
import { USDCDepositConfirmationDialog } from './USDCDeposit/USDCDepositConfirmationDialog'
import { USDCWithdrawalConfirmationDialog } from './USDCWithdrawal/USDCWithdrawalConfirmationDialog'
import { CustomFeeTokenApprovalDialog } from './CustomFeeTokenApprovalDialog'
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
  getWarningTokenDescription,
  useTokenFromSearchParams
} from './TransferPanelUtils'
import { useImportTokenModal } from '../../hooks/TransferPanel/useImportTokenModal'
import { useTransferReadiness } from './useTransferReadiness'
import { useTransactionHistory } from '../../hooks/useTransactionHistory'
import { getBridgeUiConfigForChain } from '../../util/bridgeUiConfig'
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
import { useBalances } from '../../hooks/useBalances'
import { captureSentryErrorWithExtraData } from '../../util/SentryUtils'
import { useIsBatchTransferSupported } from '../../hooks/TransferPanel/useIsBatchTransferSupported'

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
      arbTokenBridgeLoaded,
      arbTokenBridge: { eth, token },
      warningTokens
    }
  } = useAppState()
  const { layout } = useAppContextState()
  const { isTransferring } = layout
  const { address: walletAddress, isConnected } = useAccount()
  const { switchNetworkAsync } = useSwitchNetworkWithConfig({
    isSwitchingNetworkBeforeTx: true
  })
  const chainId = useChainId()
  const [networks] = useNetworks()
  const {
    childChain,
    childChainProvider,
    parentChain,
    parentChainProvider,
    isDepositMode,
    isTeleportMode
  } = useNetworksRelationship(networks)
  const latestNetworks = useLatest(networks)
  const isBatchTransferSupported = useIsBatchTransferSupported()

  const nativeCurrency = useNativeCurrency({ provider: childChainProvider })

  const { isEOA, isSmartContractWallet } = useAccountType()

  const { data: parentSigner } = useSigner({
    chainId: parentChain.id
  })
  const { data: childSigner } = useSigner({
    chainId: childChain.id
  })

  const { openTransactionHistoryPanel, setTransferring } =
    useAppContextActions()
  const { addPendingTransaction } = useTransactionHistory(walletAddress)

  const { isArbitrumOne, isArbitrumSepolia } = isNetwork(childChain.id)

  const latestEth = useLatest(eth)

  const isConnectedToArbitrum = useLatest(useIsConnectedToArbitrum())
  const isConnectedToOrbitChain = useLatest(useIsConnectedToOrbitChain())

  // Link the amount state directly to the amount in query params -  no need of useState
  // Both `amount` getter and setter will internally be using `useArbQueryParams` functions
  const [{ amount, amount2 }] = useArbQueryParams()

  const { setAmount, setAmount2 } = useSetInputAmount()

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

  const { destinationAddress } = useDestinationAddressStore()

  const {
    updateEthParentBalance,
    updateErc20ParentBalances,
    updateEthChildBalance
  } = useBalances()

  const [isCctp, setIsCctp] = useState(false)

  const { transferReady } = useTransferReadiness()

  const { color: destinationChainUIcolor } = getBridgeUiConfigForChain(
    networks.destinationChain.id
  )

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

  const transferCctp = async () => {
    if (!selectedToken) {
      return
    }
    if (!walletAddress) {
      return
    }
    const signer = isDepositMode ? parentSigner : childSigner
    if (!signer) {
      throw 'Signer is undefined'
    }

    setTransferring(true)
    const childChainName = getNetworkName(childChain.id)
    const isConnectedToTheWrongChain =
      chainId !== latestNetworks.current.sourceChain.id

    if (isConnectedToTheWrongChain) {
      trackEvent('Switch Network and Transfer', {
        type: isDepositMode ? 'Deposit' : 'Withdrawal',
        tokenSymbol: 'USDC',
        assetType: 'ERC-20',
        accountType: isSmartContractWallet ? 'Smart Contract' : 'EOA',
        network: childChainName,
        amount: Number(amount),
        version: 2
      })

      const switchTargetChainId = latestNetworks.current.sourceChain.id
      try {
        await switchNetworkAsync?.(switchTargetChainId)
      } catch (error) {
        captureSentryErrorWithExtraData({
          error,
          originFunction: 'transferCctp switchNetworkAsync'
        })
      }
    }

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

      const destinationAddressError = await getDestinationAddressError({
        destinationAddress,
        isSmartContractWallet,
        isTeleportMode
      })
      if (destinationAddressError) {
        console.error(destinationAddressError)
        return
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
      openTransactionHistoryPanel()
      setTransferring(false)
      clearAmountInput()
    } catch (e) {
      //
    } finally {
      setTransferring(false)
      setIsCctp(false)
    }
  }

  const transfer = async () => {
    const signerUndefinedError = 'Signer is undefined'

    try {
      setTransferring(true)
      if (chainId !== networks.sourceChain.id) {
        await switchNetworkAsync?.(networks.sourceChain.id)
      }
    } finally {
      setTransferring(false)
    }

    if (!isConnected) {
      return
    }
    if (!walletAddress) {
      return
    }

    const hasBothSigners = parentSigner && childSigner
    if (isEOA && !hasBothSigners) {
      throw signerUndefinedError
    }

    const destinationAddressError = await getDestinationAddressError({
      destinationAddress,
      isSmartContractWallet,
      isTeleportMode
    })
    if (destinationAddressError) {
      console.error(destinationAddressError)
      return
    }

    // SC ETH transfers aren't enabled yet. Safety check, shouldn't be able to get here.
    if (isSmartContractWallet && !selectedToken) {
      console.error("ETH transfers aren't enabled for smart contract wallets.")
      return
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
      if (
        (isDepositMode && !parentSigner) ||
        (!isDepositMode && !childSigner)
      ) {
        throw signerUndefinedError
      }

      const warningToken =
        selectedToken && warningTokens[selectedToken.address.toLowerCase()]
      if (warningToken) {
        const description = getWarningTokenDescription(warningToken.type)
        warningToast(
          `${selectedToken?.address} is ${description}; it will likely have unusual behavior when deployed as as standard token to Arbitrum. It is not recommended that you deploy it. (See ${DOCS_DOMAIN}/for-devs/concepts/token-bridge/token-bridge-erc20 for more info.)`
        )
        return
      }

      const depositRequiresChainSwitch = () => {
        const isParentChainEthereum = isNetwork(
          parentChain.id
        ).isEthereumMainnetOrTestnet

        return (
          isDepositMode &&
          ((isParentChainEthereum && isConnectedToArbitrum.current) ||
            isConnectedToOrbitChain.current)
        )
      }

      const withdrawalRequiresChainSwitch = () => {
        const isConnectedToEthereum =
          !isConnectedToArbitrum.current && !isConnectedToOrbitChain.current

        const { isOrbitChain: isSourceChainOrbit } = isNetwork(childChain.id)

        return (
          !isDepositMode &&
          (isConnectedToEthereum ||
            (isConnectedToArbitrum.current && isSourceChainOrbit))
        )
      }

      if (depositRequiresChainSwitch() || withdrawalRequiresChainSwitch()) {
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
          version: 2
        })

        const switchTargetChainId = latestNetworks.current.sourceChain.id

        await switchNetworkAsync?.(switchTargetChainId)

        // keep checking till we know the connected chain-pair are correct for transfer
        while (
          depositRequiresChainSwitch() ||
          withdrawalRequiresChainSwitch() ||
          !latestEth.current ||
          !arbTokenBridgeLoaded
        ) {
          await new Promise(r => setTimeout(r, 100))
        }

        await new Promise(r => setTimeout(r, 3000))
      }

      const sourceChainId = latestNetworks.current.sourceChain.id
      const destinationChainId = latestNetworks.current.destinationChain.id
      const connectedChainId = networks.sourceChain.id
      const sourceChainEqualsConnectedChain = sourceChainId === connectedChainId

      // Transfer is invalid if the connected chain doesn't mismatches source-destination chain requirements
      const depositNetworkConnectionWarning =
        isDepositMode &&
        (!sourceChainEqualsConnectedChain || isConnectedToOrbitChain.current)
      const withdrawalNetworkConnectionWarning =
        !isDepositMode && !sourceChainEqualsConnectedChain
      if (
        depositNetworkConnectionWarning ||
        withdrawalNetworkConnectionWarning
      ) {
        return networkConnectionWarningToast()
      }

      const sourceChainErc20Address = isDepositMode
        ? selectedToken?.address
        : selectedToken?.l2Address

      const destinationChainErc20Address = isDepositMode
        ? selectedToken?.l2Address
        : selectedToken?.address

      const signer = isDepositMode ? parentSigner : childSigner

      const bridgeTransferStarter = await BridgeTransferStarterFactory.create({
        sourceChainId,
        sourceChainErc20Address,
        destinationChainId,
        destinationChainErc20Address
      })

      const { isNativeCurrencyTransfer, isWithdrawal } =
        getBridgeTransferProperties({
          sourceChainId,
          sourceChainErc20Address,
          destinationChainId
        })

      if (!signer) throw Error('Signer not connected!')

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

      // SCW transfers are not enabled for ETH transfers yet
      if (isNativeCurrencyTransfer && isSmartContractWallet) {
        console.error(
          "ETH transfers aren't enabled for smart contract wallets."
        )
        return
      }

      // if destination address is added, validate it
      const destinationAddressError = await getDestinationAddressError({
        destinationAddress,
        isSmartContractWallet,
        isTeleportMode
      })
      if (destinationAddressError) {
        console.error(destinationAddressError)
        return
      }

      const isNativeCurrencyApprovalRequired =
        await bridgeTransferStarter.requiresNativeCurrencyApproval({
          signer,
          amount: amountBigNumber
        })

      if (isNativeCurrencyApprovalRequired) {
        // show native currency approval dialog
        const userConfirmation = await customFeeTokenApproval()
        if (!userConfirmation) return false

        const approvalTx = await bridgeTransferStarter.approveNativeCurrency({
          signer,
          amount: amountBigNumber
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
            amount: Number(amount)
          }
        )
      }

      const overrides: TransferOverrides = {}

      const isBatchTransfer = isBatchTransferSupported && Number(amount2) > 0

      if (isBatchTransfer) {
        // when sending additional ETH with ERC-20, we add the additional ETH value as maxSubmissionCost
        const gasEstimates = (await bridgeTransferStarter.transferEstimateGas({
          amount: amountBigNumber,
          signer
        })) as DepositGasEstimates

        if (!gasEstimates.estimatedChildChainSubmissionCost) {
          errorToast('Failed to estimate deposit maxSubmissionCost')
          throw 'Failed to estimate deposit maxSubmissionCost'
        }

        overrides.maxSubmissionCost = utils
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

    if (!isSmartContractWallet) {
      trackEvent(
        isTeleportMode ? 'Teleport' : isDepositMode ? 'Deposit' : 'Withdraw',
        {
          tokenSymbol: selectedToken?.symbol,
          assetType: selectedToken ? 'ERC-20' : 'ETH',
          accountType: 'EOA',
          network: getNetworkName(childChain.id),
          amount: Number(amount)
        }
      )
    }

    const { sourceChainTransaction } = bridgeTransfer

    const isBatchTransfer = isBatchTransferSupported && Number(amount2) > 0

    const timestampCreated = Math.floor(Date.now() / 1000).toString()

    const txHistoryCompatibleObject = convertBridgeSdkToMergedTransaction({
      bridgeTransfer,
      parentChainId: parentChain.id,
      childChainId: childChain.id,
      selectedToken,
      walletAddress,
      destinationAddress,
      nativeCurrency,
      amount: amountBigNumber,
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
          amount: amountBigNumber,
          amount2: isBatchTransfer ? utils.parseEther(amount2) : undefined,
          timestampCreated
        })
      )
    }

    openTransactionHistoryPanel()
    setTransferring(false)
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

  const isCctpTransfer = useMemo(() => {
    if (!selectedToken) {
      return false
    }

    if (isTeleportMode) {
      return false
    }

    if (isDepositMode) {
      if (isTokenMainnetUSDC(selectedToken.address) && isArbitrumOne) {
        return true
      }

      if (isTokenSepoliaUSDC(selectedToken.address) && isArbitrumSepolia) {
        return true
      }
    } else {
      if (
        isTokenArbitrumOneNativeUSDC(selectedToken.address) &&
        isArbitrumOne
      ) {
        return true
      }

      if (
        isTokenArbitrumSepoliaNativeUSDC(selectedToken.address) &&
        isArbitrumSepolia
      ) {
        return true
      }
    }

    return false
  }, [isArbitrumOne, isArbitrumSepolia, isDepositMode, selectedToken])

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
        <div className="transfer-panel-stats">
          {isDepositMode ? (
            <Button
              variant="primary"
              loading={isTransferring}
              disabled={!transferReady.deposit}
              onClick={() => {
                if (isCctpTransfer) {
                  transferCctp()
                } else if (selectedToken) {
                  depositToken()
                } else {
                  transfer()
                }
              }}
              style={{
                borderColor: destinationChainUIcolor,
                backgroundColor: `${destinationChainUIcolor}66`
              }}
              className={twMerge(
                'w-full border bg-eth-dark py-3 text-lg',
                'disabled:!border-white/10 disabled:!bg-white/10',
                'lg:text-2xl'
              )}
            >
              {isSmartContractWallet && isTransferring
                ? 'Sending request...'
                : `Move funds to ${getNetworkName(
                    networks.destinationChain.id
                  )}`}
            </Button>
          ) : (
            <Button
              variant="primary"
              loading={isTransferring}
              disabled={!transferReady.withdrawal}
              onClick={() => {
                if (isCctpTransfer) {
                  transferCctp()
                } else {
                  transfer()
                }
              }}
              style={{
                borderColor: destinationChainUIcolor,
                backgroundColor: `${destinationChainUIcolor}66`
              }}
              className={twMerge(
                'w-full border py-3 text-lg',
                'disabled:!border-white/10 disabled:!bg-white/10',
                'lg:text-2xl'
              )}
            >
              {isSmartContractWallet && isTransferring
                ? 'Sending request...'
                : `Move funds to ${getNetworkName(
                    networks.destinationChain.id
                  )}`}
            </Button>
          )}
        </div>

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
    </>
  )
}
