import { useState, useMemo, useEffect, useCallback } from 'react'
import Tippy from '@tippyjs/react'
import { BigNumber, constants, utils } from 'ethers'
import { isAddress } from 'ethers/lib/utils'
import { useLatest } from 'react-use'
import { twMerge } from 'tailwind-merge'
import * as Sentry from '@sentry/react'
import { useAccount, useSigner } from 'wagmi'
import { ERC20__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ERC20__factory'
import { JsonRpcProvider } from '@ethersproject/providers'

import { useAppState } from '../../state'
import { ConnectionState } from '../../util'
import { getNetworkName, isNetwork } from '../../util/networks'
import { Button } from '../common/Button'
import {
  TokenDepositCheckDialog,
  TokenDepositCheckDialogType
} from './TokenDepositCheckDialog'
import { TokenImportDialog } from './TokenImportDialog'
import { isWithdrawOnlyToken } from '../../util/WithdrawOnlyUtils'
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
import {
  TransferPanelMain,
  TransferPanelMainErrorMessage
} from './TransferPanelMain'
import { useIsSwitchingL2Chain } from './TransferPanelMainUtils'
import { NonCanonicalTokensBridgeInfo } from '../../util/fastBridges'
import { tokenRequiresApprovalOnL2 } from '../../util/L2ApprovalUtils'
import {
  getL2ERC20Address,
  fetchErc20Allowance,
  fetchErc20L1GatewayAddress,
  fetchErc20L2GatewayAddress,
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
import { fetchPerMessageBurnLimit } from '../../hooks/CCTP/fetchCCTPLimits'
import { isUserRejectedError } from '../../util/isUserRejectedError'
import { formatAmount } from '../../util/NumberUtils'
import {
  getUsdcTokenAddressFromSourceChainId,
  useCctpState
} from '../../state/cctpState'
import { getAttestationHashAndMessageFromReceipt } from '../../util/cctp/getAttestationHashAndMessageFromReceipt'
import { DepositStatus } from '../../state/app/state'
import { getStandardizedTimestamp } from '../../state/app/utils'
import { getContracts, useCCTP } from '../../hooks/CCTP/useCCTP'
import { useNetworks } from '../../hooks/useNetworks'
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship'

const onTxError = (error: any) => {
  if (!isUserRejectedError(error)) {
    Sentry.captureException(error)
  }
}

const isAllowedL2 = async ({
  l1TokenAddress,
  l2TokenAddress,
  walletAddress,
  amountNeeded,
  l2Provider
}: {
  l1TokenAddress: string
  l2TokenAddress: string
  walletAddress: string
  amountNeeded: BigNumber
  l2Provider: JsonRpcProvider
}) => {
  const token = ERC20__factory.connect(l2TokenAddress, l2Provider)

  const gatewayAddress = await fetchErc20L2GatewayAddress({
    erc20L1Address: l1TokenAddress,
    l2Provider
  })

  return (await token.allowance(walletAddress, gatewayAddress)).gte(
    amountNeeded
  )
}

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

enum ImportTokenModalStatus {
  // "IDLE" is here to distinguish between the modal never being opened, and being closed after a user interaction
  IDLE,
  OPEN,
  CLOSED
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
      arbTokenBridge: { eth, token },
      arbTokenBridge,
      warningTokens
    }
  } = useAppState()
  const { layout } = useAppContextState()
  const { isTransferring } = layout
  const { address: walletAddress, isConnected } = useAccount()
  const { switchNetworkAsync } = useSwitchNetworkWithConfig({
    isSwitchingNetworkBeforeTx: true
  })

  const [networks] = useNetworks()
  const { childChain, parentChain } = useNetworksRelationship(networks)
  const latestConnectedProvider = useLatest(networks.fromProvider)
  const latestNetworksAndSigners = useLatest(networks)
  const { isEOA, isSmartContractWallet } = useAccountType()

  const { data: l1Signer } = useSigner({
    chainId: parentChain.id
  })
  const { data: l2Signer } = useSigner({
    chainId: childChain.id
  })

  const { updateTransfer, setPendingTransfer } = useCctpState()

  const {
    openTransactionHistoryPanel,
    setTransferring,
    showCctpDepositsTransactions,
    showCctpWithdrawalsTransactions,
    setTransactionHistoryTab
  } = useAppContextActions()

  const { isMainnet } = isNetwork(parentChain.id)
  const { isArbitrumNova } = isNetwork(childChain.id)

  const latestEth = useLatest(eth)
  const latestToken = useLatest(token)

  const isSwitchingL2Chain = useIsSwitchingL2Chain()
  const isConnectedToArbitrum = useLatest(useIsConnectedToArbitrum())
  const isConnectedToOrbitChain = useLatest(useIsConnectedToOrbitChain())

  // Link the amount state directly to the amount in query params -  no need of useState
  // Both `amount` getter and setter will internally be using `useArbQueryParams` functions
  const [{ amount }, setQueryParams] = useArbQueryParams()
  const amountNum = parseFloat(amount) // just a numerical variant of amount
  const setAmount = useCallback(
    (newAmount: string) => {
      setQueryParams({ amount: newAmount })
    },
    [setQueryParams]
  )

  const { approveForBurn, depositForBurn } = useCCTP({
    sourceChainId: latestNetworksAndSigners.current.from.id
  })

  const [tokenCheckDialogProps, openTokenCheckDialog] = useDialog()
  const [tokenApprovalDialogProps, openTokenApprovalDialog] = useDialog()
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
  } = useBalance({ provider: networks.fromProvider, walletAddress })
  const {
    eth: [ethL2Balance],
    erc20: [erc20L2Balances]
  } = useBalance({ provider: networks.toProvider, walletAddress })

  const ethBalance = useMemo(() => {
    return isDepositMode ? ethL1Balance : ethL2Balance
  }, [ethL1Balance, ethL2Balance, isDepositMode])

  const [allowance, setAllowance] = useState<BigNumber | null>(null)
  const [isCctp, setIsCctp] = useState(false)

  const { error: destinationAddressError, destinationAddress } =
    useDestinationAddressStore()

  function clearAmountInput() {
    // clear amount input on transfer panel
    setAmount('')
  }

  useEffect(() => {
    if (importTokenModalStatus !== ImportTokenModalStatus.IDLE) {
      return
    }

    if (
      connectionState === ConnectionState.L1_CONNECTED ||
      connectionState === ConnectionState.L2_CONNECTED
    ) {
      setImportTokenModalStatus(ImportTokenModalStatus.OPEN)
    }
  }, [connectionState, importTokenModalStatus])

  useEffect(() => {
    // Check in case of an account switch or network switch
    if (typeof walletAddress === 'undefined') {
      return
    }

    // Don't open when the token import dialog should open
    if (typeof tokenFromSearchParams !== 'undefined') {
      return
    }

    if (!ethL1Balance) {
      return
    }
  }, [
    ethL1Balance,
    walletAddress,
    isMainnet,
    isDepositMode,
    arbTokenBridge,
    tokenFromSearchParams
  ])

  const l1Balance = useMemo(() => {
    if (selectedToken) {
      const balanceL1 = erc20L1Balances?.[selectedToken.address.toLowerCase()]
      const { decimals } = selectedToken
      if (!balanceL1 || !decimals) {
        return null
      }
      return utils.formatUnits(balanceL1, decimals)
    }

    if (!ethL1Balance) {
      return null
    }
    return utils.formatUnits(ethL1Balance, 18)
  }, [ethL1Balance, erc20L1Balances, selectedToken])

  const l2Balance = useMemo(() => {
    if (selectedToken) {
      const addressLookup =
        isTokenArbitrumOneNativeUSDC(selectedToken.address) ||
        isTokenArbitrumGoerliNativeUSDC(selectedToken.address)
          ? selectedToken.address.toLowerCase()
          : (selectedToken.l2Address || '').toLowerCase()

      const balanceL2 = erc20L2Balances?.[addressLookup]
      const { decimals } = selectedToken

      if (!balanceL2) {
        return null
      }
      return utils.formatUnits(balanceL2, decimals)
    }

    if (!ethL2Balance) {
      return null
    }
    return utils.formatUnits(ethL2Balance, 18)
  }, [ethL2Balance, erc20L2Balances, selectedToken])

  const isBridgingANewStandardToken = useMemo(() => {
    const isUnbridgedToken =
      selectedToken !== null && typeof selectedToken.l2Address === 'undefined'

    return isConnected && isDepositMode && isUnbridgedToken
  }, [isConnected, isDepositMode, selectedToken])

  const isNonCanonicalToken = useMemo(() => {
    if (selectedToken) {
      return Object.keys(NonCanonicalTokensBridgeInfo)
        .map(key => key.toLowerCase())
        .includes(selectedToken.address.toLowerCase())
    }
    return false
  }, [selectedToken])

  async function depositToken() {
    if (!selectedToken) {
      throw new Error('Invalid app state: no selected token')
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
      return utils.parseUnits(amount || '0', selectedToken?.decimals ?? 18)
    } catch (error) {
      return constants.Zero
    }
  }, [amount, selectedToken])

  // SC wallet transfer requests are sent immediately, delay it to give user an impression of a tx sent
  const showDelayedSCTxRequest = () =>
    setTimeout(() => {
      setTransferring(false)
      setShowSCWalletTooltip(true)
    }, 3000)

  const transferCctp = async (type: 'deposits' | 'withdrawals') => {
    if (!selectedToken) {
      return
    }
    if (!walletAddress) {
      return
    }
    const isDeposit = type === 'deposits'
    const signer = isDeposit ? l1Signer : l2Signer
    if (!signer) {
      throw 'Signer is undefined'
    }

    setTransferring(true)
    let currentNetwork = latestNetworksAndSigners.current.fromProvider.network

    const currentNetworkName = getNetworkName(currentNetwork.chainId)
    const isConnectedToTheWrongChain =
      (isDeposit && isConnectedToArbitrum.current) ||
      (type === 'withdrawals' && !isConnectedToArbitrum.current)

    if (isConnectedToTheWrongChain) {
      if (shouldTrackAnalytics(currentNetworkName)) {
        trackEvent('Switch Network and Transfer', {
          type: isDeposit ? 'Deposit' : 'Withdrawal',
          tokenSymbol: 'USDC',
          assetType: 'ERC-20',
          accountType: isSmartContractWallet ? 'Smart Contract' : 'EOA',
          network: currentNetworkName,
          amount: Number(amount)
        })
      }
      const switchTargetChainId = latestNetworksAndSigners.current.from.id
      try {
        await switchNetworkAsync?.(switchTargetChainId)
        currentNetwork = latestNetworksAndSigners.current.fromProvider.network
      } catch (e) {
        if (isUserRejectedError(e)) {
          return
        }
      }
    }

    try {
      const sourceChainId = latestNetworksAndSigners.current.from.id

      const waitForInput = isDeposit
        ? openUSDCDepositConfirmationDialog()
        : openUSDCWithdrawalConfirmationDialog()
      const [confirmed, primaryButtonClicked] = await waitForInput()

      if (!confirmed) {
        return
      }
      if (isDeposit && primaryButtonClicked === 'bridged') {
        // User has selected normal bridge (USDC.e)
        depositToken()
        return
      }

      // CCTP has an upper limit for transfer
      const burnLimit = await fetchPerMessageBurnLimit({
        sourceChainId
      })

      if (burnLimit.lte(amountBigNumber)) {
        const formatedLimit = formatAmount(burnLimit, {
          decimals: selectedToken.decimals,
          symbol: 'USDC'
        })
        errorToast(
          `The limit for transfers using CCTP is ${formatedLimit}. Please lower your amount and try again.`
        )
        return
      }

      const recipient = destinationAddress || walletAddress
      const { usdcContractAddress, tokenMessengerContractAddress } =
        getContracts(sourceChainId)

      const allowance = await fetchErc20Allowance({
        address: usdcContractAddress,
        provider: networks.fromProvider,
        owner: walletAddress,
        spender: tokenMessengerContractAddress
      })

      if (allowance.lt(amountBigNumber)) {
        setAllowance(allowance)
        setIsCctp(true)
        const waitForInput = openTokenApprovalDialog()
        const [confirmed] = await waitForInput()

        if (!confirmed) {
          return
        }

        try {
          if (isSmartContractWallet) {
            showDelayedSCTxRequest()
          }
          const tx = await approveForBurn(amountBigNumber, signer)
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
        depositForBurnTx = await depositForBurn({
          amount: amountBigNumber,
          signer,
          recipient: destinationAddress || walletAddress
        })
      } catch (error) {
        if (isUserRejectedError(error)) {
          return
        }
        Sentry.captureException(error)
        errorToast(
          `USDC deposit transaction failed: ${
            (error as Error)?.message ?? error
          }`
        )
      }

      if (isSmartContractWallet) {
        // For SCW, we assume that the transaction went through
        if (shouldTrackAnalytics(currentNetworkName)) {
          trackEvent(isDeposit ? 'CCTP Deposit' : 'CCTP Withdrawal', {
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
        trackEvent(isDeposit ? 'CCTP Deposit' : 'CCTP Withdrawal', {
          accountType: 'EOA',
          network: currentNetworkName,
          amount: Number(amount),
          complete: false
        })
      }
      setPendingTransfer({
        txId: depositForBurnTx.hash,
        asset: 'USDC',
        blockNum: null,
        createdAt: getStandardizedTimestamp(new Date().toString()),
        direction: isDeposit ? 'deposit' : 'withdraw',
        isWithdrawal: !isDeposit,
        resolvedAt: null,
        status: 'pending',
        uniqueId: null,
        value: amount,
        depositStatus: DepositStatus.CCTP_DEFAULT_STATE,
        destination: recipient,
        sender: walletAddress,
        isCctp: true,
        tokenAddress: getUsdcTokenAddressFromSourceChainId(sourceChainId),
        cctpData: {
          sourceChainId,
          attestationHash: null,
          messageBytes: null,
          receiveMessageTransactionHash: null,
          receiveMessageTimestamp: null
        }
      })

      if (isDeposit) {
        showCctpDepositsTransactions()
      } else {
        showCctpWithdrawalsTransactions()
      }
      setTransactionHistoryTab(TransactionHistoryTab.CCTP)
      openTransactionHistoryPanel()
      setTransferring(false)
      clearAmountInput()

      const depositTxReceipt = await depositForBurnTx.wait()
      const { messageBytes, attestationHash } =
        getAttestationHashAndMessageFromReceipt(depositTxReceipt)

      if (depositTxReceipt.status === 0) {
        errorToast('USDC deposit transaction failed')
        return
      }

      if (messageBytes && attestationHash) {
        updateTransfer({
          txId: depositForBurnTx.hash,
          blockNum: depositTxReceipt.blockNumber,
          status: 'Unconfirmed',
          cctpData: {
            attestationHash,
            messageBytes
          }
        })
      }
    } catch (e) {
    } finally {
      setTransferring(false)
      setIsCctp(false)
    }
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

    // Make sure Ethereum and/or Orbit chains are not selected as a pair.
    const ethereumOrOrbitPairsSelected = [
      networks.from.id,
      networks.to.id
    ].every(id => {
      const { isEthereum, isOrbitChain } = isNetwork(id)
      return isEthereum || isOrbitChain
    })
    if (ethereumOrOrbitPairsSelected) {
      console.error('Cannot transfer funds between L1 and/or Orbit chains.')
      return
    }

    const l2NetworkName = getNetworkName(networks.to.id)

    setTransferring(true)

    try {
      if (isDepositMode) {
        if (!l1Signer) {
          throw signerUndefinedError
        }

        const warningToken =
          selectedToken && warningTokens[selectedToken.address.toLowerCase()]
        if (warningToken) {
          const description = (() => {
            switch (warningToken.type) {
              case 0:
                return 'a supply rebasing token'
              case 1:
                return 'an interest accruing token'
              default:
                return 'a non-standard ERC20 token'
            }
          })()
          return window.alert(
            `${selectedToken?.address} is ${description}; it will likely have unusual behavior when deployed as as standard token to Arbitrum. It is not recommended that you deploy it. (See ${DOCS_DOMAIN}/for-devs/concepts/token-bridge/token-bridge-erc20 for more info.)`
          )
        }

        const isParentChainEthereum = isNetwork(networks.from.id).isEthereum
        // Only switch to L1 if the selected L1 network is Ethereum.
        // Or if connected to an Orbit chain as it can't make deposits.
        if (
          (isConnectedToArbitrum.current && isParentChainEthereum) ||
          isConnectedToOrbitChain.current
        ) {
          if (shouldTrackAnalytics(l2NetworkName)) {
            trackEvent('Switch Network and Transfer', {
              type: 'Deposit',
              tokenSymbol: selectedToken?.symbol,
              assetType: selectedToken ? 'ERC-20' : 'ETH',
              accountType: isSmartContractWallet ? 'Smart Contract' : 'EOA',
              network: l2NetworkName,
              amount: Number(amount)
            })
          }
          await switchNetworkAsync?.(latestNetworksAndSigners.current.from.id)

          while (
            (isConnectedToArbitrum.current && isParentChainEthereum) ||
            isConnectedToOrbitChain.current ||
            !latestEth.current ||
            !arbTokenBridgeLoaded
          ) {
            await new Promise(r => setTimeout(r, 100))
          }

          await new Promise(r => setTimeout(r, 3000))
        }

        const l1ChainID = latestNetworksAndSigners.current.from.id
        const connectedChainID = latestConnectedProvider.current.network.chainId
        const l1ChainEqualsConnectedChain =
          l1ChainID && connectedChainID && l1ChainID === connectedChainID

        if (!l1ChainEqualsConnectedChain || isConnectedToOrbitChain.current) {
          // Deposit is invalid if the connected chain doesn't match L1...
          // ...or if connected to an Orbit chain, as it can't make deposits.
          return networkConnectionWarningToast()
        }
        if (selectedToken) {
          const { decimals } = selectedToken
          const amountRaw = utils.parseUnits(amount, decimals)

          // check that a registration is not currently in progress
          const l2RoutedAddress = await getL2ERC20Address({
            erc20L1Address: selectedToken.address,
            l1Provider: networks.fromProvider,
            l2Provider: networks.toProvider
          })

          if (
            selectedToken.l2Address &&
            selectedToken.l2Address.toLowerCase() !==
              l2RoutedAddress.toLowerCase()
          ) {
            alert(
              'Depositing is currently suspended for this token as a new gateway is being registered. Please try again later and contact support if this issue persists.'
            )
            return
          }

          if (isNonCanonicalToken) {
            const waitForInput = openDepositConfirmationDialog()
            const [confirmed] = await waitForInput()

            if (!confirmed) {
              return
            }
          }

          const l1GatewayAddress = await fetchErc20L1GatewayAddress({
            erc20L1Address: selectedToken.address,
            l1Provider: networks.fromProvider,
            l2Provider: networks.toProvider
          })

          const allowanceForL1Gateway = await fetchErc20Allowance({
            address: selectedToken.address,
            provider: networks.fromProvider,
            owner: walletAddress,
            spender: l1GatewayAddress
          })

          if (!allowanceForL1Gateway.gte(amountRaw)) {
            setAllowance(allowance)
            const waitForInput = openTokenApprovalDialog()
            const [confirmed] = await waitForInput()

            if (!confirmed) {
              return false
            }
            await latestToken.current.approve({
              erc20L1Address: selectedToken.address,
              l1Signer
            })
          }

          if (isSmartContractWallet) {
            showDelayedSCTxRequest()
            // we can't call this inside the deposit method because tx is executed in an external app
            if (shouldTrackAnalytics(l2NetworkName)) {
              trackEvent('Deposit', {
                tokenSymbol: selectedToken.symbol,
                assetType: 'ERC-20',
                accountType: 'Smart Contract',
                network: l2NetworkName,
                amount: Number(amount)
              })
            }
          }

          await latestToken.current.deposit({
            erc20L1Address: selectedToken.address,
            amount: amountRaw,
            l1Signer,
            destinationAddress,
            txLifecycle: {
              onTxSubmit: () => {
                setTransactionHistoryTab(TransactionHistoryTab.DEPOSITS)
                openTransactionHistoryPanel()
                setTransferring(false)
                clearAmountInput()
                if (
                  !isSmartContractWallet &&
                  shouldTrackAnalytics(l2NetworkName)
                ) {
                  trackEvent('Deposit', {
                    tokenSymbol: selectedToken.symbol,
                    assetType: 'ERC-20',
                    accountType: 'EOA',
                    network: l2NetworkName,
                    amount: Number(amount)
                  })
                }
              },
              onTxError
            }
          })
        } else {
          const amountRaw = utils.parseUnits(amount, 18)

          await latestEth.current.deposit({
            amount: amountRaw,
            l1Signer,
            txLifecycle: {
              onTxSubmit: () => {
                setTransactionHistoryTab(TransactionHistoryTab.DEPOSITS)
                openTransactionHistoryPanel()
                setTransferring(false)
                clearAmountInput()
                if (
                  !isSmartContractWallet &&
                  shouldTrackAnalytics(l2NetworkName)
                ) {
                  trackEvent('Deposit', {
                    assetType: 'ETH',
                    accountType: 'EOA',
                    network: l2NetworkName,
                    amount: Number(amount)
                  })
                }
              },
              onTxError
            }
          })
        }
      } else {
        if (!l2Signer) {
          throw signerUndefinedError
        }

        const isConnectedToEthereum =
          !isConnectedToArbitrum.current && !isConnectedToOrbitChain.current
        const { isOrbitChain } = isNetwork(networks.to.id)

        if (
          isConnectedToEthereum ||
          (isConnectedToArbitrum.current && isOrbitChain)
        ) {
          if (shouldTrackAnalytics(l2NetworkName)) {
            trackEvent('Switch Network and Transfer', {
              type: 'Withdrawal',
              tokenSymbol: selectedToken?.symbol,
              assetType: selectedToken ? 'ERC-20' : 'ETH',
              accountType: isSmartContractWallet ? 'Smart Contract' : 'EOA',
              network: l2NetworkName,
              amount: Number(amount)
            })
          }
          await switchNetworkAsync?.(latestNetworksAndSigners.current.to.id)

          while (
            (!isConnectedToArbitrum.current &&
              !isConnectedToOrbitChain.current) ||
            (isConnectedToArbitrum.current && isOrbitChain) ||
            !latestEth.current ||
            !arbTokenBridgeLoaded
          ) {
            await new Promise(r => setTimeout(r, 100))
          }

          await new Promise(r => setTimeout(r, 3000))
        }

        if (!isSmartContractWallet) {
          const waitForInput = openWithdrawalConfirmationDialog()
          const [confirmed] = await waitForInput()

          if (!confirmed) {
            return
          }
        }

        const l2ChainID = latestNetworksAndSigners.current.to.id
        const connectedChainID =
          latestConnectedProvider.current?.network?.chainId
        if (
          !(l2ChainID && connectedChainID && +l2ChainID === connectedChainID)
        ) {
          return networkConnectionWarningToast()
        }

        if (selectedToken) {
          const { decimals } = selectedToken
          const amountRaw = utils.parseUnits(amount, decimals)

          if (
            tokenRequiresApprovalOnL2(selectedToken.address, l2ChainID) &&
            selectedToken.l2Address
          ) {
            const allowed = await isAllowedL2({
              l1TokenAddress: selectedToken.address,
              l2TokenAddress: selectedToken.l2Address,
              walletAddress,
              amountNeeded: amountRaw,
              l2Provider: latestNetworksAndSigners.current.toProvider
            })
            if (!allowed) {
              if (isSmartContractWallet) {
                showDelayedSCTxRequest()
              }

              await latestToken.current.approveL2({
                erc20L1Address: selectedToken.address,
                l2Signer
              })
            }
          }

          if (isSmartContractWallet) {
            showDelayedSCTxRequest()
            // we can't call this inside the withdraw method because tx is executed in an external app
            if (shouldTrackAnalytics(l2NetworkName)) {
              trackEvent('Withdraw', {
                tokenSymbol: selectedToken.symbol,
                assetType: 'ERC-20',
                accountType: 'Smart Contract',
                network: l2NetworkName,
                amount: Number(amount)
              })
            }
          }

          await latestToken.current.withdraw({
            erc20L1Address: selectedToken.address,
            amount: amountRaw,
            l2Signer,
            destinationAddress,
            txLifecycle: {
              onTxSubmit: () => {
                setTransactionHistoryTab(TransactionHistoryTab.WITHDRAWALS)
                openTransactionHistoryPanel()
                setTransferring(false)
                clearAmountInput()
                if (
                  !isSmartContractWallet &&
                  shouldTrackAnalytics(l2NetworkName)
                ) {
                  trackEvent('Withdraw', {
                    tokenSymbol: selectedToken.symbol,
                    assetType: 'ERC-20',
                    accountType: 'EOA',
                    network: l2NetworkName,
                    amount: Number(amount)
                  })
                }
              },
              onTxError
            }
          })
        } else {
          const amountRaw = utils.parseUnits(amount, 18)

          await latestEth.current.withdraw({
            amount: amountRaw,
            l2Signer,
            txLifecycle: {
              onTxSubmit: () => {
                setTransactionHistoryTab(TransactionHistoryTab.WITHDRAWALS)
                openTransactionHistoryPanel()
                setTransferring(false)
                clearAmountInput()
                if (
                  !isSmartContractWallet &&
                  shouldTrackAnalytics(l2NetworkName)
                ) {
                  trackEvent('Withdraw', {
                    assetType: 'ETH',
                    accountType: 'EOA',
                    network: l2NetworkName,
                    amount: Number(amount)
                  })
                }
              },
              onTxError
            }
          })
        }
      }
    } catch (ex) {
      console.log(ex)
    } finally {
      setTransferring(false)
    }
  }

  // Only run gas estimation when it makes sense, i.e. when there is enough funds
  const shouldRunGasEstimation = useMemo(
    () =>
      isDepositMode
        ? Number(amount) <= Number(l1Balance)
        : Number(amount) <= Number(l2Balance),
    [isDepositMode, l1Balance, amount, l2Balance]
  )

  const gasSummary = useGasSummary(
    amountBigNumber,
    selectedToken,
    shouldRunGasEstimation
  )
  const { status: gasEstimationStatus } = gasSummary

  const requiredGasFees = useMemo(
    // For SC wallets, the relayer pays the gas fees so we don't need to check in that case
    () => {
      if (isSmartContractWallet) {
        if (isDepositMode) {
          // L2 fee is paid in callvalue and still need to come from the wallet for retryable cost estimation to succeed
          return gasSummary.estimatedL2GasFees
        }
        return 0
      }
      return gasSummary.estimatedTotalGasFees
    },
    [isSmartContractWallet, isDepositMode, gasSummary]
  )

  const getErrorMessage = useCallback(
    (
      _amountEntered: string,
      _balance: string | null
    ): TransferPanelMainErrorMessage | undefined => {
      // No error while loading balance
      if (_balance === null || ethBalance === null) {
        return undefined
      }

      // ETH transfers using SC wallets not enabled yet
      if (isSmartContractWallet && !selectedToken) {
        return TransferPanelMainErrorMessage.SC_WALLET_ETH_NOT_SUPPORTED
      }

      if (
        isDepositMode &&
        selectedToken &&
        isWithdrawOnlyToken(selectedToken.address, networks.to.id)
      ) {
        return TransferPanelMainErrorMessage.WITHDRAW_ONLY
      }

      const amountEntered = Number(_amountEntered)
      const balance = Number(_balance)

      if (amountEntered > balance) {
        return TransferPanelMainErrorMessage.INSUFFICIENT_FUNDS
      }

      // The amount entered is enough funds, but now let's include gas costs
      switch (gasSummary.status) {
        // No error while loading gas costs
        case 'idle':
        case 'loading':
          return undefined

        case 'error':
          return TransferPanelMainErrorMessage.GAS_ESTIMATION_FAILURE

        case 'success': {
          if (selectedToken) {
            // We checked if there's enough tokens above, but let's check if there's enough ETH for gas
            const ethBalanceFloat = parseFloat(utils.formatEther(ethBalance))

            if (requiredGasFees > ethBalanceFloat) {
              return TransferPanelMainErrorMessage.INSUFFICIENT_FUNDS
            }

            return undefined
          }

          if (amountEntered + requiredGasFees > balance) {
            return TransferPanelMainErrorMessage.INSUFFICIENT_FUNDS
          }

          return undefined
        }
      }
    },
    [
      gasSummary,
      ethBalance,
      selectedToken,
      isDepositMode,
      networks.to.id,
      requiredGasFees,
      isSmartContractWallet
    ]
  )

  const disableDepositAndWithdrawal = useMemo(() => {
    if (!amountNum) return true
    if (isTransferring) return true
    if (isSwitchingL2Chain) return true
    if (destinationAddressError) return true

    if (isSmartContractWallet && !selectedToken) {
      return true
    }

    // Keep the button disabled while loading gas summary
    if (
      !ethBalance ||
      (gasSummary.status !== 'success' && gasSummary.status !== 'unavailable')
    ) {
      return true
    }

    return false
  }, [
    amountNum,
    destinationAddressError,
    isSmartContractWallet,
    ethBalance,
    requiredGasFees,
    gasSummary.status,
    isSwitchingL2Chain,
    isTransferring,
    selectedToken
  ])

  const disableDeposit = useMemo(() => {
    if (disableDepositAndWithdrawal) {
      return true
    }

    if (
      selectedToken &&
      isWithdrawOnlyToken(selectedToken.address, networks.to.id)
    ) {
      return true
    }

    if (isBridgingANewStandardToken) {
      if (l1Balance === null || amountNum > Number(l1Balance)) {
        return true
      }
    } else {
      if (!l1Balance || amountNum > Number(l1Balance)) {
        return true
      }
    }

    if (selectedToken) {
      if (!ethBalance) {
        return true
      }
      // We checked if there's enough tokens, but let's check if there's enough ETH for gas
      const ethBalanceFloat = parseFloat(utils.formatEther(ethBalance))
      return requiredGasFees > ethBalanceFloat
    }

    return Number(amount) + requiredGasFees > Number(l1Balance)
  }, [
    disableDepositAndWithdrawal,
    selectedToken,
    networks.to.id,
    isBridgingANewStandardToken,
    amount,
    requiredGasFees,
    l1Balance,
    amountNum,
    ethBalance
  ])

  const disableWithdrawal = useMemo(() => {
    if (disableDepositAndWithdrawal) {
      return true
    }

    if (!l2Balance) return true
    if (amountNum > Number(l2Balance)) return true

    if (
      selectedToken &&
      [
        '0x0e192d382a36de7011f795acc4391cd302003606',
        '0x488cc08935458403a0458e45e20c0159c8ab2c92'
      ].includes(selectedToken.address.toLowerCase())
    ) {
      return true
    }

    if (selectedToken) {
      if (!ethBalance) {
        return true
      }
      // We checked if there's enough tokens, but let's check if there's enough ETH for gas
      const ethBalanceFloat = parseFloat(utils.formatEther(ethBalance))
      return requiredGasFees > ethBalanceFloat
    }

    return Number(amount) + requiredGasFees > Number(l2Balance)
  }, [
    disableDepositAndWithdrawal,
    l2Balance,
    amountNum,
    selectedToken,
    amount,
    requiredGasFees,
    ethBalance
  ])

  const isSummaryVisible = useMemo(() => {
    if (isSwitchingL2Chain || gasEstimationStatus === 'error') {
      return false
    }

    if (isTransferring) {
      return true
    }

    return !(isDepositMode ? disableDeposit : disableWithdrawal)
  }, [
    isSwitchingL2Chain,
    gasEstimationStatus,
    isTransferring,
    isDepositMode,
    disableDeposit,
    disableWithdrawal
  ])

  const depositButtonColorClassName = useMemo(() => {
    const { isArbitrum, isArbitrumNova, isXaiTestnet, isStylusTestnet } =
      isNetwork(networks.to.id)

    if (isArbitrumNova) {
      return 'bg-arb-nova-dark'
    }

    if (isArbitrum) {
      return 'bg-arb-one-dark'
    }

    if (isXaiTestnet) {
      return 'bg-xai-dark'
    }

    if (isStylusTestnet) {
      return 'bg-stylus-dark'
    }

    // is Orbit chain
    return 'bg-orbit-dark'
  }, [networks.to.id])

  const withdrawalButtonColorClassName = useMemo(() => {
    const { isArbitrumNova: isParentChainArbitrumNova } = isNetwork(
      networks.from.id
    )
    const { isArbitrum } = isNetwork(networks.to.id)

    if (isArbitrum) {
      return 'bg-eth-dark'
    }

    // is Orbit chain
    if (isParentChainArbitrumNova) {
      return 'bg-arb-nova-dark'
    }

    return 'bg-arb-one-dark'
  }, [networks.from.id, networks.to.id])

  return (
    <>
      <TokenApprovalDialog
        {...tokenApprovalDialogProps}
        amount={amount}
        allowance={allowance}
        token={selectedToken}
        isCctp={isCctp}
      />

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
          errorMessage={
            isDepositMode
              ? getErrorMessage(amount, l1Balance)
              : getErrorMessage(amount, l2Balance)
          }
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
                amount={amountNum}
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
              disabled={disableDeposit}
              onClick={() => {
                if (
                  selectedToken &&
                  (isTokenMainnetUSDC(selectedToken.address) ||
                    isTokenGoerliUSDC(selectedToken.address)) &&
                  !isArbitrumNova
                ) {
                  transferCctp('deposits')
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
                  : `Move funds to ${getNetworkName(networks.to.id)}`}
              </span>
            </Button>
          ) : (
            <Button
              variant="primary"
              loading={isTransferring}
              disabled={disableWithdrawal}
              onClick={() => {
                if (
                  selectedToken &&
                  (isTokenArbitrumOneNativeUSDC(selectedToken.address) ||
                    isTokenArbitrumGoerliNativeUSDC(selectedToken.address))
                ) {
                  transferCctp('withdrawals')
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
                  : `Move funds to ${getNetworkName(networks.to.id)}`}
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
          symbol={selectedToken ? selectedToken.symbol : 'ETH'}
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
