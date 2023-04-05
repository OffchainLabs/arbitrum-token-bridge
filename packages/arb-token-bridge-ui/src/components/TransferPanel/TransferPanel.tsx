import { useState, useMemo, useEffect, useCallback } from 'react'
import { useWallet } from '@arbitrum/use-wallet'
import Tippy from '@tippyjs/react'
import { BigNumber, constants, utils } from 'ethers'
import { isAddress } from 'ethers/lib/utils'
import { useLatest } from 'react-use'
import { twMerge } from 'tailwind-merge'
import * as Sentry from '@sentry/react'

import { ArbTokenBridge, useBalance, getL1TokenData } from 'token-bridge-sdk'
import { useAppState } from '../../state'
import { ConnectionState } from '../../util'
import { switchChain, getNetworkName, isNetwork } from '../../util/networks'
import { addressIsSmartContract } from '../../util/AddressUtils'
import { Button } from '../common/Button'
import {
  TokenDepositCheckDialog,
  TokenDepositCheckDialogType
} from './TokenDepositCheckDialog'
import { TokenImportDialog } from './TokenImportDialog'
import { isWithdrawOnlyToken } from '../../util/WithdrawOnlyUtils'
import {
  useNetworksAndSigners,
  UseNetworksAndSignersStatus
} from '../../hooks/useNetworksAndSigners'
import { useArbQueryParams } from '../../hooks/useArbQueryParams'
import { ERC20__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ERC20__factory'
import { JsonRpcProvider } from '@ethersproject/providers'
import { useDialog } from '../common/Dialog'
import { TokenApprovalDialog } from './TokenApprovalDialog'
import { WithdrawalConfirmationDialog } from './WithdrawalConfirmationDialog'
import { DepositConfirmationDialog } from './DepositConfirmationDialog'
import { LowBalanceDialog } from './LowBalanceDialog'
import { TransferPanelSummary, useGasSummary } from './TransferPanelSummary'
import { useAppContextActions, useAppContextState } from '../App/AppContext'
import { trackEvent, isFathomNetworkName } from '../../util/AnalyticsUtils'
import {
  TransferPanelMain,
  TransferPanelMainErrorMessage
} from './TransferPanelMain'
import { useIsSwitchingL2Chain } from './TransferPanelMainUtils'
import { NonCanonicalTokensBridgeInfo } from '../../util/fastBridges'
import { tokenRequiresApprovalOnL2 } from '../../util/L2ApprovalUtils'

const onTxError = (error: any) => {
  if (error.code !== 'ACTION_REJECTED') {
    Sentry.captureException(error)
  }
}

const isAllowedL2 = async (
  arbTokenBridge: ArbTokenBridge,
  l1TokenAddress: string,
  l2TokenAddress: string,
  walletAddress: string,
  amountNeeded: BigNumber,
  l2Provider: JsonRpcProvider
) => {
  const token = ERC20__factory.connect(l2TokenAddress, l2Provider)
  const gatewayAddress = await arbTokenBridge.token.getL2GatewayAddress(
    l1TokenAddress
  )
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

export function TransferPanel() {
  const tokenFromSearchParams = useTokenFromSearchParams()

  const [tokenDepositCheckDialogType, setTokenDepositCheckDialogType] =
    useState<TokenDepositCheckDialogType>('new-token')
  const [importTokenModalStatus, setImportTokenModalStatus] =
    useState<ImportTokenModalStatus>(ImportTokenModalStatus.IDLE)
  const [showSCWalletTooltip, setShowSCWalletTooltip] = useState(false)
  const [destinationAddress, setDestinationAddress] = useState<
    string | undefined
  >(undefined)
  const [
    isDestinationAddressSmartContract,
    setIsDestinationAddressSmartContract
  ] = useState(false)

  const {
    app: {
      connectionState,
      selectedToken,
      isDepositMode,
      arbTokenBridgeLoaded,
      arbTokenBridge: { eth, token, walletAddress },
      arbTokenBridge,
      warningTokens
    }
  } = useAppState()
  const { layout } = useAppContextState()
  const { isTransferring } = layout
  const { provider, account } = useWallet()
  const latestConnectedProvider = useLatest(provider)

  const networksAndSigners = useNetworksAndSigners()
  const latestNetworksAndSigners = useLatest(networksAndSigners)
  const {
    l1: { network: l1Network, provider: l1Provider },
    l2: { network: l2Network, provider: l2Provider },
    isSmartContractWallet
  } = networksAndSigners

  const { openTransactionHistoryPanel, setTransferring } =
    useAppContextActions()

  const { isMainnet } = isNetwork(l1Network.chainID)
  const { isArbitrumNova } = isNetwork(l2Network.chainID)

  const latestEth = useLatest(eth)
  const latestToken = useLatest(token)

  const isSwitchingL2Chain = useIsSwitchingL2Chain()

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

  const [
    lowBalanceDialogProps,
    openLowBalanceDialog,
    { didOpen: didOpenLowBalanceDialog }
  ] = useDialog()
  const [tokenCheckDialogProps, openTokenCheckDialog] = useDialog()
  const [tokenApprovalDialogProps, openTokenApprovalDialog] = useDialog()
  const [withdrawalConfirmationDialogProps, openWithdrawalConfirmationDialog] =
    useDialog()
  const [depositConfirmationDialogProps, openDepositConfirmationDialog] =
    useDialog()
  const {
    eth: [ethL1Balance],
    erc20: [erc20L1Balances]
  } = useBalance({ provider: l1Provider, walletAddress })
  const {
    eth: [ethL2Balance],
    erc20: [erc20L2Balances]
  } = useBalance({ provider: l2Provider, walletAddress })

  const ethBalance = useMemo(() => {
    return isDepositMode ? ethL1Balance : ethL2Balance
  }, [ethL1Balance, ethL2Balance, isDepositMode])

  const [allowance, setAllowance] = useState<BigNumber | null>(null)

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
    const getDestinationAddressType = async () => {
      setIsDestinationAddressSmartContract(
        await addressIsSmartContract(
          String(destinationAddress),
          isDepositMode ? l2Provider : l1Provider
        )
      )
    }
    getDestinationAddressType()
  }, [destinationAddress, isDepositMode, l1Provider, l2Provider])

  useEffect(() => {
    // Check in case of an account switch or network switch
    if (
      typeof account === 'undefined' ||
      typeof arbTokenBridge.walletAddress === 'undefined'
    ) {
      return
    }

    // Wait for the bridge object to be in sync
    if (account.toLowerCase() !== arbTokenBridge.walletAddress.toLowerCase()) {
      return
    }

    // This effect runs every time the balance updates, but we want to show the dialog only once
    if (didOpenLowBalanceDialog) {
      return
    }

    // Don't open when the token import dialog should open
    if (typeof tokenFromSearchParams !== 'undefined') {
      return
    }

    if (!ethL1Balance) {
      return
    }

    const isLowBalance = ethL1Balance.lte(utils.parseEther('0.005'))

    if (isMainnet && isDepositMode && isLowBalance) {
      openLowBalanceDialog()
    }
  }, [
    ethL1Balance,
    account,
    isMainnet,
    isDepositMode,
    arbTokenBridge,
    tokenFromSearchParams,
    didOpenLowBalanceDialog,
    openLowBalanceDialog
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
      const balanceL2 = selectedToken.l2Address
        ? erc20L2Balances?.[selectedToken.l2Address.toLowerCase()]
        : undefined
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
    } else {
      return false
    }
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
      const confirmed = await waitForInput()

      if (confirmed) {
        transfer()
      }
    } else {
      transfer()
    }
  }

  const transfer = async () => {
    if (
      latestNetworksAndSigners.current.status !==
      UseNetworksAndSignersStatus.CONNECTED
    ) {
      return
    }

    // SC ETH transfers aren't enabled yet. Safety check, shouldn't be able to get here.
    if (isSmartContractWallet && !selectedToken) {
      console.error("ETH transfers aren't enabled for smart contract wallets.")
      return
    }

    const l2NetworkName = getNetworkName(l2Network.chainID)

    // SC wallet transfer requests are sent immediatelly, delay it to give user an impression of a tx sent
    const showDelayedSCTxRequest = () =>
      setTimeout(() => {
        setTransferring(false)
        setShowSCWalletTooltip(true)
      }, 3000)

    setTransferring(true)

    try {
      if (destinationAddress) {
        if (
          // Invalid address
          !isAddress(destinationAddress) ||
          // Destination address not matching the connected wallet type
          (isSmartContractWallet && !isDestinationAddressSmartContract)
        ) {
          throw new Error(
            `Couldn't initiate the transfer. Invalid destination address: ${destinationAddress}`
          )
        }
      }

      if (isDepositMode) {
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
            `${selectedToken?.address} is ${description}; it will likely have unusual behavior when deployed as as standard token to Arbitrum. It is not recommended that you deploy it. (See https://developer.offchainlabs.com/docs/bridging_assets for more info.)`
          )
        }
        if (latestNetworksAndSigners.current.isConnectedToArbitrum) {
          trackEvent('Switch Network and Transfer')
          await switchChain({
            chainId: latestNetworksAndSigners.current.l1.network.chainID,
            provider: latestConnectedProvider.current!
          })

          while (
            latestNetworksAndSigners.current.isConnectedToArbitrum ||
            !latestEth.current ||
            !arbTokenBridgeLoaded
          ) {
            await new Promise(r => setTimeout(r, 100))
          }

          await new Promise(r => setTimeout(r, 3000))
        }

        const l1ChainID = latestNetworksAndSigners.current.l1.network.chainID
        const connectedChainID =
          latestConnectedProvider.current?.network?.chainId
        if (
          !(l1ChainID && connectedChainID && l1ChainID === connectedChainID)
        ) {
          return alert('Network connection issue; contact support')
        }
        if (selectedToken) {
          const { decimals } = selectedToken
          const amountRaw = utils.parseUnits(amount, decimals)

          // check that a registration is not currently in progress
          const l2RoutedAddress = await arbTokenBridge.token.getL2ERC20Address(
            selectedToken.address
          )

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

          const { allowance } = await getL1TokenData({
            account: walletAddress,
            erc20L1Address: selectedToken.address,
            l1Provider: l1Provider,
            l2Provider: l2Provider
          })

          if (!allowance.gte(amountRaw)) {
            setAllowance(allowance)
            const waitForInput = openTokenApprovalDialog()
            const confirmed = await waitForInput()

            if (!confirmed) {
              return
            }

            await latestToken.current.approve({
              erc20L1Address: selectedToken.address,
              l1Signer: latestNetworksAndSigners.current.l1.signer
            })
          }

          if (isNonCanonicalToken) {
            const waitForInput = openDepositConfirmationDialog()
            const confirmed = await waitForInput()

            if (!confirmed) {
              return
            }
          }

          if (isSmartContractWallet) {
            showDelayedSCTxRequest()
            // we can't call this inside the deposit method because tx is executed in an external app
            if (isFathomNetworkName(l2NetworkName)) {
              trackEvent(`Deposit ERC-20 to ${l2NetworkName} (Smart Contract)`)
            }
          }

          await latestToken.current.deposit({
            erc20L1Address: selectedToken.address,
            amount: amountRaw,
            l1Signer: latestNetworksAndSigners.current.l1.signer,
            destinationAddress,
            txLifecycle: {
              onTxSubmit: () => {
                openTransactionHistoryPanel()
                setTransferring(false)
                if (
                  !isSmartContractWallet &&
                  isFathomNetworkName(l2NetworkName)
                ) {
                  trackEvent(`Deposit ERC-20 to ${l2NetworkName} (EOA)`)
                }
              },
              onTxError
            }
          })
        } else {
          const amountRaw = utils.parseUnits(amount, 18)

          await latestEth.current.deposit({
            amount: amountRaw,
            l1Signer: latestNetworksAndSigners.current.l1.signer,
            txLifecycle: {
              onTxSubmit: () => {
                openTransactionHistoryPanel()
                setTransferring(false)
                if (
                  !isSmartContractWallet &&
                  isFathomNetworkName(l2NetworkName)
                ) {
                  trackEvent(`Deposit ETH to ${l2NetworkName} (EOA)`)
                }
              },
              onTxError
            }
          })
        }
      } else {
        if (!latestNetworksAndSigners.current.isConnectedToArbitrum) {
          trackEvent('Switch Network and Transfer')
          await switchChain({
            chainId: latestNetworksAndSigners.current.l2.network.chainID,
            provider: latestConnectedProvider.current!
          })

          while (
            !latestNetworksAndSigners.current.isConnectedToArbitrum ||
            !latestEth.current ||
            !arbTokenBridgeLoaded
          ) {
            await new Promise(r => setTimeout(r, 100))
          }

          await new Promise(r => setTimeout(r, 3000))
        }

        if (!isSmartContractWallet) {
          const waitForInput = openWithdrawalConfirmationDialog()
          const confirmed = await waitForInput()

          if (!confirmed) {
            return
          }
        }

        const l2ChainID = latestNetworksAndSigners.current.l2.network.chainID
        const connectedChainID =
          latestConnectedProvider.current?.network?.chainId
        if (
          !(l2ChainID && connectedChainID && +l2ChainID === connectedChainID)
        ) {
          return alert('Network connection issue; contact support')
        }

        if (selectedToken) {
          const { decimals } = selectedToken
          const amountRaw = utils.parseUnits(amount, decimals)

          if (
            tokenRequiresApprovalOnL2(selectedToken.address, l2ChainID) &&
            selectedToken.l2Address
          ) {
            const allowed = await isAllowedL2(
              arbTokenBridge,
              selectedToken.address,
              selectedToken.l2Address,
              walletAddress,
              amountRaw,
              latestNetworksAndSigners.current.l2.provider
            )
            if (!allowed) {
              if (isSmartContractWallet) {
                showDelayedSCTxRequest()
              }
              await latestToken.current.approveL2({
                erc20L1Address: selectedToken.address,
                l2Signer: latestNetworksAndSigners.current.l2.signer
              })
            }
          }

          if (isSmartContractWallet) {
            showDelayedSCTxRequest()
            // we can't call this inside the withdraw method because tx is executed in an external app
            if (isFathomNetworkName(l2NetworkName)) {
              trackEvent(
                `Withdraw ERC-20 from ${l2NetworkName} (Smart Contract)`
              )
            }
          }

          await latestToken.current.withdraw({
            erc20L1Address: selectedToken.address,
            amount: amountRaw,
            l2Signer: latestNetworksAndSigners.current.l2.signer,
            destinationAddress,
            txLifecycle: {
              onTxSubmit: () => {
                openTransactionHistoryPanel()
                setTransferring(false)
                if (
                  !isSmartContractWallet &&
                  isFathomNetworkName(l2NetworkName)
                ) {
                  trackEvent(`Withdraw ERC-20 from ${l2NetworkName} (EOA)`)
                }
              },
              onTxError
            }
          })
        } else {
          const amountRaw = utils.parseUnits(amount, 18)

          await latestEth.current.withdraw({
            amount: amountRaw,
            l2Signer: latestNetworksAndSigners.current.l2.signer,
            txLifecycle: {
              onTxSubmit: () => {
                openTransactionHistoryPanel()
                setTransferring(false)
                if (
                  !isSmartContractWallet &&
                  isFathomNetworkName(l2NetworkName)
                ) {
                  trackEvent(`Withdraw ETH from ${l2NetworkName} (EOA)`)
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

  const amountBigNumber = useMemo(() => {
    try {
      return utils.parseUnits(amount || '0', selectedToken?.decimals ?? 18)
    } catch (error) {
      return constants.Zero
    }
  }, [amount, selectedToken])

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
        isWithdrawOnlyToken(selectedToken.address, l2Network.chainID)
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

            if (gasSummary.estimatedTotalGasFees > ethBalanceFloat) {
              return TransferPanelMainErrorMessage.INSUFFICIENT_FUNDS
            }

            return undefined
          }

          if (amountEntered + gasSummary.estimatedTotalGasFees > balance) {
            return TransferPanelMainErrorMessage.INSUFFICIENT_FUNDS
          }

          return undefined
        }
      }
    },
    [gasSummary, ethBalance, selectedToken, isDepositMode, l2Network]
  )

  const disableDeposit = useMemo(() => {
    if (
      isDepositMode &&
      selectedToken &&
      isWithdrawOnlyToken(selectedToken.address, l2Network.chainID)
    ) {
      return true
    }

    return (
      isTransferring ||
      !amountNum ||
      (isDepositMode &&
        !isBridgingANewStandardToken &&
        (!amountNum || !l1Balance || amountNum > +l1Balance)) ||
      // allow 0-amount deposits when bridging new token
      (isDepositMode &&
        isBridgingANewStandardToken &&
        (l1Balance === null || amountNum > +l1Balance)) ||
      (isSmartContractWallet && !isDestinationAddressSmartContract) ||
      (isSmartContractWallet && !selectedToken)
    )
  }, [
    isTransferring,
    isDepositMode,
    l2Network,
    amountNum,
    l1Balance,
    isBridgingANewStandardToken,
    selectedToken,
    isSmartContractWallet,
    isDestinationAddressSmartContract
  ])

  // TODO: Refactor this and the property above
  const disableDepositV2 = useMemo(() => {
    // Keep the button disabled while loading gas summary
    if (!ethBalance || disableDeposit || gasSummary.status !== 'success') {
      return true
    }

    if (selectedToken) {
      // We checked if there's enough tokens, but let's check if there's enough ETH for gas
      const ethBalanceFloat = parseFloat(utils.formatEther(ethBalance))
      return gasSummary.estimatedTotalGasFees > ethBalanceFloat
    }

    return Number(amount) + gasSummary.estimatedTotalGasFees > Number(l1Balance)
  }, [ethBalance, disableDeposit, selectedToken, gasSummary, amount, l1Balance])

  const disableWithdrawal = useMemo(() => {
    return (
      (selectedToken &&
        selectedToken.address &&
        selectedToken.address.toLowerCase() ===
          '0x0e192d382a36de7011f795acc4391cd302003606'.toLowerCase()) ||
      (selectedToken &&
        selectedToken.address &&
        selectedToken.address.toLowerCase() ===
          '0x488cc08935458403a0458e45E20c0159c8AB2c92'.toLowerCase()) ||
      isTransferring ||
      (!isDepositMode &&
        (!amountNum || !l2Balance || amountNum > +l2Balance)) ||
      (isSmartContractWallet && !isDestinationAddressSmartContract) ||
      (isSmartContractWallet && !selectedToken)
    )
  }, [
    isTransferring,
    isDepositMode,
    amountNum,
    l2Balance,
    selectedToken,
    isSmartContractWallet,
    isDestinationAddressSmartContract
  ])

  // TODO: Refactor this and the property above
  const disableWithdrawalV2 = useMemo(() => {
    // Keep the button disabled while loading gas summary
    if (!ethBalance || disableWithdrawal || gasSummary.status !== 'success') {
      return true
    }

    if (selectedToken) {
      // We checked if there's enough tokens, but let's check if there's enough ETH for gas
      const ethBalanceFloat = parseFloat(utils.formatEther(ethBalance))
      return gasSummary.estimatedTotalGasFees > ethBalanceFloat
    }

    return Number(amount) + gasSummary.estimatedTotalGasFees > Number(l2Balance)
  }, [
    ethBalance,
    disableWithdrawal,
    selectedToken,
    gasSummary,
    amount,
    l2Balance
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

  return (
    <>
      <TokenApprovalDialog
        {...tokenApprovalDialogProps}
        amount={amount}
        allowance={allowance}
        token={selectedToken}
      />

      <WithdrawalConfirmationDialog
        {...withdrawalConfirmationDialogProps}
        amount={amount}
      />

      <DepositConfirmationDialog
        {...depositConfirmationDialogProps}
        amount={amount}
      />

      <LowBalanceDialog {...lowBalanceDialogProps} />

      <div className="flex max-w-screen-lg flex-col space-y-6 bg-white shadow-[0px_4px_20px_rgba(0,0,0,0.2)] lg:flex-row lg:space-y-0 lg:space-x-6 lg:rounded-xl">
        <TransferPanelMain
          amount={amount}
          setAmount={setAmount}
          errorMessage={
            isDepositMode
              ? getErrorMessage(amount, l1Balance)
              : getErrorMessage(amount, l2Balance)
          }
          destinationAddress={destinationAddress}
          setDestinationAddress={setDestinationAddress}
        />

        <div className="border-r border-gray-3" />

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
          className="transfer-panel-stats flex w-full flex-col justify-between bg-gray-3 px-6 py-6 lg:rounded-tr-xl lg:rounded-br-xl lg:bg-white lg:px-0 lg:pr-6"
        >
          <div className="flex flex-col">
            <div className="hidden lg:block">
              <span className="text-2xl">Summary</span>
              <div className="h-4" />
            </div>

            {isSummaryVisible ? (
              <TransferPanelSummary
                amount={amountNum}
                token={selectedToken}
                gasSummary={gasSummary}
              />
            ) : (
              <div className="hidden text-lg text-gray-7 lg:block lg:min-h-[297px]">
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
              disabled={isSwitchingL2Chain || disableDepositV2}
              onClick={() => {
                if (selectedToken) {
                  depositToken()
                } else {
                  transfer()
                }
              }}
              className={twMerge(
                'w-full bg-blue-arbitrum py-4 text-lg lg:text-2xl',
                isArbitrumNova ? 'bg-[#8a4100]' : 'bg-blue-arbitrum'
              )}
            >
              {isSmartContractWallet && isTransferring
                ? 'Sending request...'
                : `Move funds to ${getNetworkName(l2Network.chainID)}`}
            </Button>
          ) : (
            <Button
              variant="primary"
              loading={isTransferring}
              disabled={isSwitchingL2Chain || disableWithdrawalV2}
              onClick={transfer}
              className="w-full bg-purple-ethereum py-4 text-lg lg:text-2xl"
            >
              {isSmartContractWallet && isTransferring
                ? 'Sending request...'
                : `Move funds to ${getNetworkName(l1Network.chainID)}`}
            </Button>
          )}
        </div>

        {typeof tokenFromSearchParams !== 'undefined' && (
          <TokenImportDialog
            isOpen={importTokenModalStatus === ImportTokenModalStatus.OPEN}
            onClose={() =>
              setImportTokenModalStatus(ImportTokenModalStatus.CLOSED)
            }
            address={tokenFromSearchParams}
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
