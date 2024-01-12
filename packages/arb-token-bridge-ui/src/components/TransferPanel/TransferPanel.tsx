import dayjs from 'dayjs'
import { useState, useMemo, useCallback } from 'react'
import Tippy from '@tippyjs/react'
import { BigNumber, constants, utils } from 'ethers'
import { useLatest } from 'react-use'
import { twMerge } from 'tailwind-merge'
import * as Sentry from '@sentry/react'
import { useAccount, useProvider, useSigner } from 'wagmi'
import { Provider, TransactionResponse } from '@ethersproject/providers'

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
import { TransferPanelSummary, useGasSummary } from './TransferPanelSummary'
import { useAppContextActions, useAppContextState } from '../App/AppContext'
import { trackEvent, shouldTrackAnalytics } from '../../util/AnalyticsUtils'
import { TransferPanelMain } from './TransferPanelMain'
import {
  getL2ERC20Address,
  isTokenArbitrumGoerliNativeUSDC,
  isTokenArbitrumOneNativeUSDC,
  isTokenGoerliUSDC,
  isTokenMainnetUSDC
} from '../../util/TokenUtils'
import { useBalance } from '../../hooks/useBalance'
import { useSwitchNetworkWithConfig } from '../../hooks/useSwitchNetworkWithConfig'
import { useIsConnectedToArbitrum } from '../../hooks/useIsConnectedToArbitrum'
import { useIsConnectedToOrbitChain } from '../../hooks/useIsConnectedToOrbitChain'
import { errorToast, warningToast } from '../common/atoms/Toast'
import { ExternalLink } from '../common/ExternalLink'
import { useAccountType } from '../../hooks/useAccountType'
import { DOCS_DOMAIN, GET_HELP_LINK } from '../../constants'
import {
  getDestinationAddressError,
  useDestinationAddressStore
} from './AdvancedSettings'
import { USDCDepositConfirmationDialog } from './USDCDeposit/USDCDepositConfirmationDialog'
import { USDCWithdrawalConfirmationDialog } from './USDCWithdrawal/USDCWithdrawalConfirmationDialog'
import { CustomFeeTokenApprovalDialog } from './CustomFeeTokenApprovalDialog'
import { isUserRejectedError } from '../../util/isUserRejectedError'
import { getUsdcTokenAddressFromSourceChainId } from '../../state/cctpState'
import { getAttestationHashAndMessageFromReceipt } from '../../util/cctp/getAttestationHashAndMessageFromReceipt'
import { DepositStatus, MergedTransaction } from '../../state/app/state'
import { useNativeCurrency } from '../../hooks/useNativeCurrency'
import { AssetType, ERC20BridgeToken } from '../../hooks/arbTokenBridge.types'
import { useStyles } from '../../hooks/TransferPanel/useStyles'
import {
  ImportTokenModalStatus,
  getWarningTokenDescription,
  onTxError,
  useTokenFromSearchParams
} from './TransferPanelUtils'
import { useImportTokenModal } from '../../hooks/TransferPanel/useImportTokenModal'
import { useSummaryVisibility } from '../../hooks/TransferPanel/useSummaryVisibility'
import { useTransferReadiness } from './useTransferReadiness'
import { useTransactionHistory } from '../../hooks/useTransactionHistory'
import { getChainIdFromProvider } from '@/token-bridge-sdk/utils'
import { CctpTransferStarter } from '@/token-bridge-sdk/CctpTransferStarter'
import { BridgeTransferStarterFactory } from '@/token-bridge-sdk/BridgeTransferStarterFactory'
import { BridgeTransfer } from '@/token-bridge-sdk/BridgeTransferStarter'
import { addDepositToCache } from '../TransactionHistory/helpers'
import {
  convertBridgeSdkToMergedTransaction,
  convertBridgeSdkToPendingDepositTransaction
} from './bridgeSdkConversionUtils'
import { isTeleport } from '@/token-bridge-sdk/teleport'

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
  const { tokenFromSearchParams, setTokenQueryParam } =
    useTokenFromSearchParams()

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
      arbTokenBridge: { eth, token },
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

  const { openTransactionHistoryPanel, setTransferring } =
    useAppContextActions()
  const { addPendingTransaction } = useTransactionHistory(walletAddress)

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

  const {
    eth: [ethL1Balance, updateEthL1Balance],
    erc20: [erc20L1Balances, updateErc20L1Balance]
  } = useBalance({ provider: l1Provider, walletAddress })
  const {
    eth: [ethL2Balance, updateEthL2Balance],
    erc20: [erc20L2Balances]
  } = useBalance({ provider: l2Provider, walletAddress })

  const nativeCurrency = useNativeCurrency({ provider: l2Provider })

  const [allowance, setAllowance] = useState<BigNumber | null>(null)
  const [isCctp, setIsCctp] = useState(false)

  const { destinationAddress } = useDestinationAddressStore()

  function closeWithResetTokenImportDialog() {
    setTokenQueryParam(undefined)
    setImportTokenModalStatus(ImportTokenModalStatus.CLOSED)
    tokenImportDialogProps.onClose(false)
  }

  function clearAmountInput() {
    // clear amount input on transfer panel
    setAmount('')
  }

  useImportTokenModal({
    importTokenModalStatus,
    connectionState
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
      setShowSCWalletTooltip(true)
    }, 3000)
    return true
  }

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

  const confirmWithdrawal = async () => {
    const waitForInput = openWithdrawalConfirmationDialog()
    const [confirmed] = await waitForInput()
    return confirmed
  }

  // SC wallet transfer requests are sent immediately, delay it to give user an impression of a tx sent
  const showDelayedSCTxRequest = () =>
    setTimeout(() => {
      setTransferring(false)
      setShowSCWalletTooltip(true)
    }, 3000)

  const checkTokenSuspension = async ({
    selectedToken,
    l1Provider,
    l2Provider
  }: {
    selectedToken: ERC20BridgeToken
    l1Provider: Provider
    l2Provider: Provider
  }) => {
    // check that a registration is not currently in progress
    const l2RoutedAddress = await getL2ERC20Address({
      erc20L1Address: selectedToken.address,
      l1Provider,
      l2Provider
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

  const transferCctp = async () => {
    if (!selectedToken) {
      return
    }
    if (!walletAddress) {
      return
    }
    const signer = isDepositMode ? l1Signer : l2Signer
    if (!signer) {
      throw 'Signer is undefined'
    }

    setTransferring(true)

    let currentNetwork = isDepositMode
      ? latestNetworksAndSigners.current.l1.network
      : latestNetworksAndSigners.current.l2.network

    const currentNetworkName = getNetworkName(currentNetwork.id)
    const isConnectedToTheWrongChain =
      (isDepositMode && isConnectedToArbitrum.current) ||
      (!isDepositMode && !isConnectedToArbitrum.current)

    if (isConnectedToTheWrongChain) {
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

    try {
      const l1Provider = latestNetworksAndSigners.current.l1.provider
      const l2Provider = latestNetworksAndSigners.current.l2.provider

      const sourceChainProvider = isDepositMode ? l1Provider : l2Provider
      const destinationChainProvider = isDepositMode ? l2Provider : l1Provider

      const sourceChainId = await getChainIdFromProvider(sourceChainProvider)

      // show confirmation popup before cctp transfer
      if (isDepositMode) {
        const depositConfirmation =
          await confirmUsdcDepositFromNormalOrCctpBridge()

        if (!depositConfirmation) return false

        // if user selects usdc.e, redirect to our canonical transfer function
        if (depositConfirmation === 'bridge-normal-usdce') {
          depositToken()
          return
        }
      } else {
        const withdrawalConfirmation = await confirmUsdcWithdrawalForCctp()
        if (!withdrawalConfirmation) return
      }

      const destinationAddressError = await getDestinationAddressError({
        destinationAddress,
        isSmartContractWallet
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
          showDelayedSCTxRequest()
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
          Sentry.captureException(error)
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
          showDelayedSCTxRequest()
        }
        const transfer = await cctpTransferStarter.transfer({
          amount: amountBigNumber,
          signer
        })
        depositForBurnTx = transfer.sourceChainTransaction
      } catch (error) {
        if (isUserRejectedError(error)) {
          return
        }
        Sentry.captureException(error)
        errorToast(
          `USDC ${
            isDepositMode ? 'Deposit' : 'Withdrawal'
          } transaction failed: ${(error as Error)?.message ?? error}`
        )
      }

      if (isSmartContractWallet) {
        // For SCW, we assume that the transaction went through
        if (shouldTrackAnalytics(currentNetworkName)) {
          trackEvent(isDepositMode ? 'CCTP Deposit' : 'CCTP Withdrawal', {
            accountType: 'Smart Contract',
            network: currentNetworkName,
            amount: Number(amount),
            complete: false
          })
        }
        return
      }

      if (!depositForBurnTx) {
        return
      }

      if (shouldTrackAnalytics(currentNetworkName)) {
        trackEvent(isDepositMode ? 'CCTP Deposit' : 'CCTP Withdrawal', {
          accountType: 'EOA',
          network: currentNetworkName,
          amount: Number(amount),
          complete: false
        })
      }

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
        tokenAddress: getUsdcTokenAddressFromSourceChainId(sourceChainId),
        cctpData: {
          sourceChainId,
          attestationHash: null,
          messageBytes: null,
          receiveMessageTransactionHash: null,
          receiveMessageTimestamp: null
        },
        parentChainId: l1Network.id,
        childChainId: l2Network.id
      }
      openTransactionHistoryPanel()
      setTransferring(false)
      clearAmountInput()

      const depositTxReceipt = await depositForBurnTx.wait()
      const { messageBytes, attestationHash } =
        getAttestationHashAndMessageFromReceipt(depositTxReceipt)

      if (depositTxReceipt.status === 0) {
        errorToast(
          `USDC ${isDepositMode ? 'deposit' : 'withdrawal'} transaction failed`
        )
        return
      }

      if (messageBytes && attestationHash) {
        addPendingTransaction(newTransfer)
      }
    } catch (error) {
    } finally {
      setTransferring(false)
      setIsCctp(false)
    }
  }

  const depositRequiresChainSwitch = () => {
    const isParentChainEthereum = isNetwork(
      l1Network.id
    ).isEthereumMainnetOrTestnet

    return (
      isDepositMode && isParentChainEthereum && isConnectedToArbitrum.current
    )
  }

  const withdrawalRequiresChainSwitch = () => {
    const isConnectedToEthereum =
      !isConnectedToArbitrum.current && !isConnectedToOrbitChain.current

    const { isOrbitChain } = isNetwork(l2Network.id)

    return (
      !isDepositMode &&
      (isConnectedToEthereum || (isConnectedToArbitrum.current && isOrbitChain))
    )
  }

  const transfer = async () => {
    const signerUndefinedError = 'Signer is undefined'

    if (!isConnected) {
      return
    }
    if (!walletAddress) {
      return
    }

    const hasBothSigners = l1Signer && l2Signer
    if (isEOA && !hasBothSigners) {
      throw signerUndefinedError
    }

    const destinationAddressError = await getDestinationAddressError({
      destinationAddress,
      isSmartContractWallet
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

    // // Make sure Ethereum and/or Orbit chains are not selected as a pair.
    // const ethereumOrOrbitPairsSelected = [l1Network.id, l2Network.id].every(
    //   id => {
    //     const { isEthereumMainnetOrTestnet, isOrbitChain } = isNetwork(id)
    //     return isEthereumMainnetOrTestnet || isOrbitChain
    //   }
    // )
    // if (ethereumOrOrbitPairsSelected) {
    //   console.error('Cannot transfer funds between L1 and/or Orbit chains.')
    //   return
    // }

    const l2NetworkName = getNetworkName(l2Network.id)

    setTransferring(true)

    try {
      if ((isDepositMode && !l1Signer) || (!isDepositMode && !l2Signer)) {
        throw signerUndefinedError
      }

      const warningToken =
        selectedToken && warningTokens[selectedToken.address.toLowerCase()]
      if (warningToken) {
        const description = getWarningTokenDescription(warningToken.type)
        return window.alert(
          `${selectedToken?.address} is ${description}; it will likely have unusual behavior when deployed as as standard token to Arbitrum. It is not recommended that you deploy it. (See ${DOCS_DOMAIN}/for-devs/concepts/token-bridge/token-bridge-erc20 for more info.)`
        )
      }

      if (depositRequiresChainSwitch() || withdrawalRequiresChainSwitch()) {
        if (shouldTrackAnalytics(l2NetworkName)) {
          trackEvent('Switch Network and Transfer', {
            type: isDepositMode ? 'Deposit' : 'Withdrawal',
            tokenSymbol: selectedToken?.symbol,
            assetType: selectedToken ? 'ERC-20' : 'ETH',
            accountType: isSmartContractWallet ? 'Smart Contract' : 'EOA',
            network: l2NetworkName,
            amount: Number(amount)
          })
        }

        const switchTargetChainId = isDepositMode
          ? latestNetworksAndSigners.current.l1.network.id
          : latestNetworksAndSigners.current.l2.network.id

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

      const l1ChainID = latestNetworksAndSigners.current.l1.network.id
      const connectedChainID = latestConnectedProvider.current?.network?.chainId
      const l1ChainEqualsConnectedChain =
        l1ChainID && connectedChainID && l1ChainID === connectedChainID

      const l2ChainID = latestNetworksAndSigners.current.l2.network.id

      // Transfer is invalid if the connected chain doesn't mismatches source-destination chain requirements
      const depositNetworkConnectionWarning =
        isDepositMode &&
        (!l1ChainEqualsConnectedChain || isConnectedToOrbitChain.current)
      const withdrawalNetworkConnectionWarning =
        !isDepositMode &&
        !(l2ChainID && connectedChainID && +l2ChainID === connectedChainID)
      if (
        depositNetworkConnectionWarning ||
        withdrawalNetworkConnectionWarning
      ) {
        return networkConnectionWarningToast()
      }

      const sourceChainProvider = isDepositMode
        ? latestNetworksAndSigners.current.l1.provider
        : latestNetworksAndSigners.current.l2.provider
      const destinationChainProvider = isDepositMode
        ? latestNetworksAndSigners.current.l2.provider
        : latestNetworksAndSigners.current.l1.provider
      const sourceChainErc20Address = isDepositMode
        ? selectedToken?.address
        : selectedToken?.l2Address

      const signer = isDepositMode ? l1Signer : l2Signer

      const bridgeTransferStarter = await BridgeTransferStarterFactory.init({
        sourceChainProvider,
        destinationChainProvider,
        sourceChainErc20Address
      })

      const { transferType } = bridgeTransferStarter

      if (!signer) throw Error('Signer not connected!')

      // SCW transfers are not enabled for ETH transfers yet
      if (transferType.includes('eth') && isSmartContractWallet) {
        console.error(
          "ETH transfers aren't enabled for smart contract wallets."
        )
        return
      }

      // if destination address is added, validate it
      const destinationAddressError = await getDestinationAddressError({
        destinationAddress,
        isSmartContractWallet
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

        await bridgeTransferStarter.approveNativeCurrency({
          signer
        })
      }

      // checks for selected token, if any
      if (selectedToken) {
        const tokenAddress = selectedToken.address

        // is selected token deployed on parent-chain?
        if (!tokenAddress) Error('Token not deployed on source chain.')

        // warning token handling
        const warningToken =
          selectedToken && warningTokens[selectedToken.address.toLowerCase()]
        if (warningToken) {
          const description = getWarningTokenDescription(warningToken.type)
          return window.alert(
            `${selectedToken?.address} is ${description}; it will likely have unusual behavior when deployed as as standard token to Arbitrum. It is not recommended that you deploy it. (See ${DOCS_DOMAIN}/for-devs/concepts/token-bridge/token-bridge-erc20 for more info.)`
          )
        }

        // token suspension handling
        const isTokenSuspended = await checkTokenSuspension({
          selectedToken,
          l1Provider,
          l2Provider
        })
        if (isTokenSuspended) {
          const message =
            'Depositing is currently suspended for this token as a new gateway is being registered. Please try again later and contact support if this issue persists.'
          alert(message)
          throw message
        }

        // if token is being bridged for first time, it will need to be registered in gateway
        const userConfirmationForFirstTimeTokenBridging =
          await firstTimeTokenBridgingConfirmation()
        if (!userConfirmationForFirstTimeTokenBridging) {
          throw Error('User declined bridging the token for the first time')
        }

        // if withdrawal (and not smart-contract-wallet), confirm from user about the delays involved
        if (transferType.includes('withdrawal') && !isSmartContractWallet) {
          const withdrawalConfirmation = await confirmWithdrawal()
          if (!withdrawalConfirmation) return false
        }

        // token approval
        const isTokenApprovalRequired =
          await bridgeTransferStarter.requiresTokenApproval({
            amount: amountBigNumber,
            signer,
            destinationAddress
          })
        if (isTokenApprovalRequired) {
          const userConfirmation = await tokenAllowanceApproval()
          if (!userConfirmation) return false

          if (isSmartContractWallet && transferType.includes('withdrawal')) {
            showDelayInSmartContractTransaction()
          }
          await bridgeTransferStarter.approveToken({
            signer
          })
        }
      }

      // show a delay in case of SCW because tx is executed in an external app
      if (isSmartContractWallet) {
        showDelayInSmartContractTransaction()
        if (shouldTrackAnalytics(l2NetworkName)) {
          trackEvent(isDepositMode ? 'Deposit' : 'Withdraw', {
            tokenSymbol: selectedToken?.symbol,
            assetType: 'ERC-20',
            accountType: 'Smart Contract',
            network: l2NetworkName,
            amount: Number(amount)
          })
        }
      }

      // finally, call the transfer function
      const transfer = await bridgeTransferStarter.transfer({
        amount: amountBigNumber,
        signer,
        isSmartContractWallet,
        destinationAddress
      })

      // transaction submitted callback
      onTxSubmit(transfer)
    } catch (ex) {
      console.log(ex)
    } finally {
      setTransferring(false)
    }
  }

  const onTxSubmit = async (bridgeTransfer: BridgeTransfer) => {
    const l2NetworkName = getNetworkName(l2Network.id)
    if (!isSmartContractWallet && shouldTrackAnalytics(l2NetworkName)) {
      trackEvent(isDepositMode ? 'Deposit' : 'Withdraw', {
        tokenSymbol: selectedToken?.symbol,
        assetType: selectedToken ? 'ERC-20' : 'ETH',
        accountType: 'EOA',
        network: l2NetworkName,
        amount: Number(amount)
      })
    }

    const { transferType, sourceChainTransaction } = bridgeTransfer
    const isDeposit =
      transferType.includes('deposit') ||
      isTeleport({
        sourceChainId: l1Network.id,
        destinationChainId: l2Network.id
      })

    const uiCompatibleTransactionObject = convertBridgeSdkToMergedTransaction({
      bridgeTransfer,
      l1Network,
      l2Network,
      selectedToken,
      walletAddress: walletAddress!,
      destinationAddress,
      nativeCurrency,
      amount: amountBigNumber
    })

    // add transaction to the transaction history
    addPendingTransaction(uiCompatibleTransactionObject)

    // if deposit, add to local cache
    if (isDeposit) {
      addDepositToCache(
        convertBridgeSdkToPendingDepositTransaction({
          bridgeTransfer,
          l1Network,
          l2Network,
          selectedToken,
          walletAddress: walletAddress!,
          destinationAddress,
          nativeCurrency,
          amount: amountBigNumber
        })
      )
    }

    openTransactionHistoryPanel()
    setTransferring(false)
    clearAmountInput()

    await (sourceChainTransaction as TransactionResponse).wait()

    // tx confirmed, update balances
    await Promise.all([updateEthL1Balance(), updateEthL2Balance()])

    if (selectedToken) {
      token.updateTokenData(selectedToken.address)
    }

    if (nativeCurrency.isCustom) {
      await updateErc20L1Balance([nativeCurrency.address])
    }
  }

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
              onClick={() => {
                if (
                  selectedToken &&
                  (isTokenMainnetUSDC(selectedToken.address) ||
                    isTokenGoerliUSDC(selectedToken.address)) &&
                  !isArbitrumNova
                ) {
                  transferCctp()
                } else if (selectedToken) {
                  depositToken()
                } else {
                  transfer()
                }
              }}
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
              onClick={() => {
                if (
                  selectedToken &&
                  (isTokenArbitrumOneNativeUSDC(selectedToken.address) ||
                    isTokenArbitrumGoerliNativeUSDC(selectedToken.address))
                ) {
                  transferCctp()
                } else {
                  transfer()
                }
              }}
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
