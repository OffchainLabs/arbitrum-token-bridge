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
import { useIsOftV2Transfer } from './hooks/useIsOftV2Transfer'
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
import { TokenApprovalDialog } from './TokenApprovalDialog'
import { WithdrawalConfirmationDialog } from './WithdrawalConfirmationDialog'
import { CustomDestinationAddressConfirmationDialog } from './CustomDestinationAddressConfirmationDialog'
import { TransferPanelSummary } from './TransferPanelSummary'
import { useAppContextActions } from '../App/AppContext'
import { trackEvent } from '../../util/AnalyticsUtils'
import type { AnalyticsEventMap } from '../../util/AnalyticsUtils'
import { TransferPanelMain } from './TransferPanelMain'
import { isTokenNativeUSDC } from '../../util/TokenUtils'
import { useSwitchNetworkWithConfig } from '../../hooks/useSwitchNetworkWithConfig'
import { warningToast } from '../common/atoms/Toast'
import { useAccountType } from '../../hooks/useAccountType'
import { GET_HELP_LINK } from '../../constants'
import { AdvancedSettings } from './AdvancedSettings'
import { USDCDepositConfirmationDialog } from './USDCDeposit/USDCDepositConfirmationDialog'
import { USDCWithdrawalConfirmationDialog } from './USDCWithdrawal/USDCWithdrawalConfirmationDialog'
import { CustomFeeTokenApprovalDialog } from './CustomFeeTokenApprovalDialog'
import { isUserRejectedError } from '../../util/isUserRejectedError'
import { useNativeCurrency } from '../../hooks/useNativeCurrency'
import { ImportTokenModalStatus } from './TransferPanelUtils'
import { useTransactionHistory } from '../../hooks/useTransactionHistory'
import { useNetworks } from '../../hooks/useNetworks'
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship'
import { BridgeTransfer } from '@/token-bridge-sdk/BridgeTransferStarter'
import { addDepositToCache } from '../TransactionHistory/helpers'
import {
  convertBridgeSdkToMergedTransaction,
  convertBridgeSdkToPendingDepositTransaction
} from './bridgeSdkConversionUtils'
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
import { executeTransfer } from '../../token-bridge-sdk/TransferManager'

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
  const { address: walletAddress } = useAccount()
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

  const { openDialog: openTokenImportDialog } = useTokenImportDialogStore()
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
        return transfer()
      }
    } else {
      return transfer()
    }
  }

  const amountBigNumber = useAmountBigNumber()

  const tokenAllowanceApproval = async () => {
    setIsCctp(false)
    const waitForInput = openTokenApprovalDialog()
    const [confirmed] = await waitForInput()
    return confirmed
  }

  const customFeeTokenApproval = async () => {
    const waitForInput = openCustomFeeTokenApprovalDialog()
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

  const transfer = async () => {
    if (!signer) {
      throw new Error(signerUndefinedError)
    }
    if (!isTransferAllowed) {
      throw new Error(transferNotAllowedError)
    }

    // SC Teleport transfers aren't enabled yet. Safety check, shouldn't be able to get here.
    if (isSmartContractWallet && isTeleportMode) {
      console.error(
        getSmartContractWalletTeleportTransfersNotSupportedErrorMessage()
      )
      return
    }

    setTransferring(true)

    try {
      const context = {
        amount: amountBigNumber,
        amount2: isBatchTransfer ? utils.parseEther(amount2) : undefined,
        signer,
        sourceChainProvider: latestNetworks.current.sourceChainProvider,
        destinationChainProvider:
          latestNetworks.current.destinationChainProvider,
        destinationAddress: latestDestinationAddress.current,
        sourceChainErc20Address: isDepositMode
          ? selectedToken?.address
          : selectedToken?.l2Address,
        destinationChainErc20Address: isDepositMode
          ? selectedToken?.l2Address
          : selectedToken?.address,
        isSmartContractWallet,
        isTeleportMode,
        isDepositMode,
        walletAddress,
        selectedToken: selectedToken ?? undefined,
        sourceChainId: latestNetworks.current.sourceChain.id,
        destinationChainId: latestNetworks.current.destinationChain.id,
        isBatchTransfer,
        nativeCurrencyDecimals: nativeCurrencyDecimalsOnSourceChain,
        isCctp: isCctpTransfer,
        isOftTransfer,
        // Callbacks for UI interactions
        onTokenApprovalNeeded: async () => {
          setIsCctp(isCctpTransfer) // Set CCTP state for the approval dialog
          const confirmed = await tokenAllowanceApproval()
          return confirmed
        },
        onNativeCurrencyApprovalNeeded: async () => {
          const confirmed = await customFeeTokenApproval()
          return confirmed
        },
        onWithdrawalConfirmationNeeded: async () => {
          const confirmed = await confirmWithdrawal()
          return confirmed
        },
        onCustomDestinationAddressConfirmationNeeded: async () => {
          const confirmed = await confirmCustomDestinationAddressForSCWallets()
          return confirmed
        },
        onFirstTimeTokenBridgingConfirmationNeeded: async () => {
          const confirmed = await firstTimeTokenBridgingConfirmation()
          return confirmed
        },
        onSmartContractWalletDelayNeeded: async () => {
          await showDelayInSmartContractTransaction()
        },
        onCctpDepositConfirmationNeeded: async () => {
          const waitForInput = openUSDCDepositConfirmationDialog()
          const [confirmed, primaryButtonClicked] = await waitForInput()
          if (!confirmed) return false
          return primaryButtonClicked === 'bridged'
            ? 'bridge-normal-usdce'
            : 'bridge-cctp-usd'
        },
        onCctpWithdrawalConfirmationNeeded: async () => {
          const waitForInput = openUSDCWithdrawalConfirmationDialog()
          const [confirmed] = await waitForInput()
          return confirmed
        },
        onTrackEvent: (
          event: keyof AnalyticsEventMap,
          data: AnalyticsEventMap[typeof event]
        ) => {
          trackEvent(event, {
            ...data,
            network: getNetworkName(childChain.id),
            amount2: isBatchTransfer ? Number(amount2) : undefined,
            isCustomDestinationTransfer: !!latestDestinationAddress.current,
            parentChainErc20Address: selectedToken?.address
          })
        }
      }

      const finalResult = await executeTransfer(context)

      // Handle successful transfer
      onTxSubmit(finalResult)

      if (isCctpTransfer) {
        setIsCctp(false)
      }
    } catch (error) {
      if (isUserRejectedError(error)) {
        return
      }
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
          network: getNetworkName(childChain.id),
          amount: Number(amount),
          amount2: isBatchTransfer ? Number(amount2) : undefined,
          version: 2
        })
        await switchNetworkAsync?.(networks.sourceChain.id)
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

    if (isDepositMode && selectedToken) {
      return depositToken()
    }
    return transfer()
  }

  return (
    <>
      <TokenApprovalDialog
        {...tokenApprovalDialogProps}
        token={selectedToken}
        isCctp={isCctp}
        isOft={isOftTransfer}
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
