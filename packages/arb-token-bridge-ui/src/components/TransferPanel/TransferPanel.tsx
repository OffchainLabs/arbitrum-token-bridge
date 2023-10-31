import { useState, useMemo, useCallback } from 'react'
import Tippy from '@tippyjs/react'
import { BigNumber, constants, utils } from 'ethers'
import { isAddress } from 'ethers/lib/utils'
import { useLatest } from 'react-use'
import { twMerge } from 'tailwind-merge'
import * as Sentry from '@sentry/react'
import { useAccount, useProvider, useSigner } from 'wagmi'
import { ERC20__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ERC20__factory'
import { JsonRpcProvider } from '@ethersproject/providers'
import { Erc20Bridger, EthBridger } from '@arbitrum/sdk'

import { useAppState } from '../../state'
import { getNetworkName, isNetwork } from '../../util/networks'
import { Button } from '../common/Button'
import {
  TokenDepositCheckDialog,
  TokenDepositCheckDialogType
} from './TokenDepositCheckDialog'
import { TokenImportDialog } from './TokenImportDialog'
import { isWithdrawOnlyToken } from '../../util/WithdrawOnlyUtils'
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
import { CustomFeeTokenApprovalDialog } from './CustomFeeTokenApprovalDialog'
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

  const { updateTransfer, setPendingTransfer } = useCctpState()

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

  const isSwitchingL2Chain = useIsSwitchingL2Chain()
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

  const { approveForBurn, depositForBurn } = useCCTP({
    sourceChainId: isDepositMode
      ? latestNetworksAndSigners.current.l1.network.id
      : latestNetworksAndSigners.current.l2.network.id
  })

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

  const { error: destinationAddressError, destinationAddress } =
    useDestinationAddressStore()

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

  const selectedTokenIsWithdrawOnly = useMemo(() => {
    if (!selectedToken) {
      return false
    }

    return isWithdrawOnlyToken(selectedToken.address, l2Network.id)
  }, [selectedToken, l2Network])

  const isBridgingANewStandardToken = useMemo(() => {
    const isConnected = typeof l1Network !== 'undefined'
    const isUnbridgedToken =
      selectedToken !== null && typeof selectedToken.l2Address === 'undefined'

    return isConnected && isDepositMode && isUnbridgedToken
  }, [l1Network, isDepositMode, selectedToken])

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

  async function approveCustomFeeTokenForInbox(): Promise<boolean> {
    if (typeof walletAddress === 'undefined') {
      throw new Error('walletAddress is undefined')
    }

    if (!l1Signer) {
      throw new Error('failed to find signer')
    }

    const ethBridger = await EthBridger.fromProvider(l2Provider)
    const l2Network = ethBridger.l2Network

    if (typeof l2Network.nativeToken === 'undefined') {
      throw new Error('l2 network does not use custom fee token')
    }

    const customFeeTokenAllowanceForInbox = await fetchErc20Allowance({
      address: l2Network.nativeToken,
      provider: l1Provider,
      owner: walletAddress,
      spender: l2Network.ethBridge.inbox
    })

    const amountBigNumber = utils.parseUnits(amount, nativeCurrency.decimals)
    // We want to bridge a certain amount of the custom fee token, so we have to check if the allowance is enough.
    if (!customFeeTokenAllowanceForInbox.gte(amountBigNumber)) {
      const waitForInput = openCustomFeeTokenApprovalDialog()
      const confirmed = await waitForInput()

      if (!confirmed) {
        return false
      }

      const approveCustomFeeTokenTx = await ethBridger.approveFeeToken({
        l1Signer
      })
      await approveCustomFeeTokenTx.wait()
    }

    return true
  }

  async function approveCustomFeeTokenForGateway(): Promise<boolean> {
    if (typeof walletAddress === 'undefined') {
      throw new Error('walletAddress is undefined')
    }

    if (!l1Signer) {
      throw new Error('failed to find signer')
    }

    if (!selectedToken) {
      throw new Error('no selected token')
    }

    const erc20Bridger = await Erc20Bridger.fromProvider(l2Provider)
    const l2Network = erc20Bridger.l2Network

    if (typeof l2Network.nativeToken === 'undefined') {
      throw new Error('l2 network does not use custom fee token')
    }

    const gateway = await erc20Bridger.getL1GatewayAddress(
      selectedToken.address,
      l1Provider
    )

    const customFeeTokenAllowanceForGateway = await fetchErc20Allowance({
      address: l2Network.nativeToken,
      provider: l1Provider,
      owner: walletAddress,
      spender: gateway
    })

    // We want to bridge a certain amount of an ERC-20 token, but the retryable fees on the child chain will be paid in the custom fee token.
    const { retryableData } = await erc20Bridger.getDepositRequest({
      from: walletAddress,
      amount: utils.parseUnits(amount, selectedToken.decimals),
      erc20L1Address: selectedToken.address,
      l1Provider,
      l2Provider
    })

    // maxSubmissionCost + gasLimit * maxFeePerGas
    const retryableFees = retryableData.maxSubmissionCost
      //
      .add(retryableData.gasLimit.mul(retryableData.maxFeePerGas))

    // We have to check if the allowance is enough to cover the fees.
    if (!customFeeTokenAllowanceForGateway.gte(retryableFees)) {
      const waitForInput = openCustomFeeTokenApprovalDialog()
      const confirmed = await waitForInput()

      if (!confirmed) {
        return false
      }

      const approveCustomFeeTokenTx = await erc20Bridger.approveFeeToken({
        erc20L1Address: selectedToken.address,
        l1Signer
      })
      await approveCustomFeeTokenTx.wait()
    }

    return true
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
    let currentNetwork = isDeposit
      ? latestNetworksAndSigners.current.l1.network
      : latestNetworksAndSigners.current.l2.network

    const currentNetworkName = getNetworkName(currentNetwork.id)
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
      const switchTargetChainId = isDeposit
        ? latestNetworksAndSigners.current.l1.network.id
        : latestNetworksAndSigners.current.l2.network.id
      try {
        await switchNetworkAsync?.(switchTargetChainId)
        currentNetwork = isDeposit
          ? latestNetworksAndSigners.current.l1.network
          : latestNetworksAndSigners.current.l2.network
      } catch (e) {
        if (isUserRejectedError(e)) {
          return
        }
      }
    }

    try {
      const l1ChainID = latestNetworksAndSigners.current.l1.network.id
      const l2ChainID = latestNetworksAndSigners.current.l2.network.id
      const sourceChainId = isDeposit ? l1ChainID : l2ChainID

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
        provider: type === 'deposits' ? l1Provider : l2Provider,
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
        assetType: AssetType.ERC20,
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
    const ethereumOrOrbitPairsSelected = [l1Network.id, l2Network.id].every(
      id => {
        const { isEthereum, isOrbitChain } = isNetwork(id)
        return isEthereum || isOrbitChain
      }
    )
    if (ethereumOrOrbitPairsSelected) {
      console.error('Cannot transfer funds between L1 and/or Orbit chains.')
      return
    }

    const l2NetworkName = getNetworkName(l2Network.id)

    setTransferring(true)

    try {
      if (isDepositMode) {
        if (!l1Signer) {
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

        const isParentChainEthereum = isNetwork(l1Network.id).isEthereum
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
          await switchNetworkAsync?.(
            latestNetworksAndSigners.current.l1.network.id
          )

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

        const l1ChainID = latestNetworksAndSigners.current.l1.network.id
        const connectedChainID =
          latestConnectedProvider.current?.network?.chainId
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
            l1Provider,
            l2Provider
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

          if (nativeCurrency.isCustom) {
            const approved = await approveCustomFeeTokenForGateway()

            if (!approved) {
              return
            }
          }

          const l1GatewayAddress = await fetchErc20L1GatewayAddress({
            erc20L1Address: selectedToken.address,
            l1Provider,
            l2Provider
          })

          const allowanceForL1Gateway = await fetchErc20Allowance({
            address: selectedToken.address,
            provider: l1Provider,
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
          if (nativeCurrency.isCustom) {
            const approved = await approveCustomFeeTokenForInbox()

            if (!approved) {
              return
            }
          }

          await latestEth.current.deposit({
            amount: utils.parseUnits(amount, nativeCurrency.decimals),
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
        const { isOrbitChain } = isNetwork(l2Network.id)

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
          await switchNetworkAsync?.(
            latestNetworksAndSigners.current.l2.network.id
          )

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

        const l2ChainID = latestNetworksAndSigners.current.l2.network.id
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
              l2Provider: latestNetworksAndSigners.current.l2.provider
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
          await latestEth.current.withdraw({
            amount: utils.parseUnits(amount, nativeCurrency.decimals),
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

  console.log({ shouldRunGasEstimation })

  const gasSummary = useGasSummary(
    amountBigNumber,
    selectedToken,
    shouldRunGasEstimation
  )
  console.log({ gasSummary })
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

  const transferPanelMainErrorMessage:
    | TransferPanelMainErrorMessage
    | undefined = useMemo(() => {
    // ETH transfers using SC wallets not enabled yet
    if (isSmartContractWallet && !selectedToken) {
      return TransferPanelMainErrorMessage.SC_WALLET_ETH_NOT_SUPPORTED
    }

    const ethBalanceFloat = isDepositMode
      ? ethL1BalanceFloat
      : ethL2BalanceFloat

    const selectedTokenBalanceFloat = isDepositMode
      ? selectedTokenL1BalanceFloat
      : selectedTokenL2BalanceFloat

    const customFeeTokenBalanceFloat = isDepositMode
      ? customFeeTokenL1BalanceFloat
      : ethL2BalanceFloat

    // No error while loading ETH balance
    if (ethBalanceFloat === null) {
      return undefined
    }

    // ERC-20
    if (selectedToken) {
      if (isDepositMode && selectedTokenIsWithdrawOnly) {
        return TransferPanelMainErrorMessage.WITHDRAW_ONLY
      }

      // No error while loading ERC-20 balance
      if (selectedTokenBalanceFloat === null) {
        return undefined
      }

      // Check amount against ERC-20 balance
      if (Number(amount) > selectedTokenBalanceFloat) {
        return TransferPanelMainErrorMessage.INSUFFICIENT_FUNDS
      }
    } else if (nativeCurrency.isCustom) {
      if (customFeeTokenBalanceFloat === null) {
        return undefined
      }

      if (Number(amount) > customFeeTokenBalanceFloat) {
        return TransferPanelMainErrorMessage.INSUFFICIENT_FUNDS
      }
    }
    // ETH
    // Check amount against ETH balance
    else if (Number(amount) > ethBalanceFloat) {
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
          if (requiredGasFees > ethBalanceFloat) {
            return TransferPanelMainErrorMessage.INSUFFICIENT_FUNDS
          }

          return undefined
        }

        if (nativeCurrency.isCustom) {
          if (requiredGasFees > ethBalanceFloat) {
            return TransferPanelMainErrorMessage.INSUFFICIENT_FUNDS
          }

          return undefined
        }

        const notEnoughEthForGasFees =
          Number(amount) + requiredGasFees > ethBalanceFloat

        if (notEnoughEthForGasFees) {
          return TransferPanelMainErrorMessage.INSUFFICIENT_FUNDS
        }

        return undefined
      }
    }
  }, [
    amount,
    isDepositMode,
    isSmartContractWallet,
    selectedToken,
    selectedTokenIsWithdrawOnly,
    gasSummary,
    requiredGasFees,
    nativeCurrency,
    ethL1BalanceFloat,
    ethL2BalanceFloat,
    selectedTokenL1BalanceFloat,
    selectedTokenL2BalanceFloat,
    customFeeTokenL1BalanceFloat
  ])

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

    if (selectedToken) {
      // Still loading ERC-20 balance
      if (selectedTokenBalanceFloat === null) {
        return true
      }

      if (Number(amount) > selectedTokenBalanceFloat) {
        return true
      }

      // We checked if there's enough tokens, but let's check if there's enough ETH to cover gas
      return requiredGasFees > ethBalanceFloat
    }

    const notEnoughEthForGasFees =
      Number(amount) + requiredGasFees > ethBalanceFloat

    return notEnoughEthForGasFees
  }, [
    amount,
    destinationAddressError,
    isSmartContractWallet,
    isDepositMode,
    gasSummary.status,
    isSwitchingL2Chain,
    isTransferring,
    selectedToken,
    requiredGasFees,
    ethL1BalanceFloat,
    ethL2BalanceFloat,
    selectedTokenL1BalanceFloat,
    selectedTokenL2BalanceFloat
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

  const { isSummaryVisible } = useSummaryVisibility({
    disableDeposit,
    disableWithdrawal,
    gasEstimationStatus
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
          errorMessage={transferPanelMainErrorMessage}
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
              // disabled={disableDeposit}
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
                  : `Move funds to ${getNetworkName(l2Network.id)}`}
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
