import { useState, useMemo, useEffect, useCallback } from 'react'
import { useWallet } from '@arbitrum/use-wallet'
import { utils } from 'ethers'
import { isAddress } from 'ethers/lib/utils'
import { useLatest } from 'react-use'
import { twMerge } from 'tailwind-merge'

import { useBalance } from 'token-bridge-sdk'
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
import {
  useNetworksAndSigners,
  UseNetworksAndSignersStatus
} from '../../hooks/useNetworksAndSigners'
import { useArbQueryParams } from '../../hooks/useArbQueryParams'
import { BigNumber } from 'ethers'
import { ERC20__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ERC20__factory'
import { L1ToL2MessageStatus } from '@arbitrum/sdk/dist/lib/message/L1ToL2Message'
import { ArbTokenBridge, AssetType } from 'token-bridge-sdk'
import { JsonRpcProvider } from '@ethersproject/providers'
import { useDialog } from '../common/Dialog'
import { TokenApprovalDialog } from './TokenApprovalDialog'
import { WithdrawalConfirmationDialog } from './WithdrawalConfirmationDialog'
import { DepositConfirmationDialog } from './DepositConfirmationDialog'
import { LowBalanceDialog } from './LowBalanceDialog'
import { TransferPanelSummary, useGasSummary } from './TransferPanelSummary'
import { useAppContextDispatch } from '../App/AppContext'
import { trackEvent } from '../../util/AnalyticsUtils'
import {
  TransferPanelMain,
  TransferPanelMainErrorMessage
} from './TransferPanelMain'
import { useIsSwitchingL2Chain } from './TransferPanelMainUtils'
import { NonCanonicalTokensBridgeInfo } from '../../util/fastBridges'
import { tokenRequiresApprovalOnL2 } from '../../util/L2ApprovalUtils'
import { L1ToL2MessageData } from 'token-bridge-sdk/dist/hooks/useTransactions'

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

  const {
    app: {
      connectionState,
      changeNetwork,
      selectedToken,
      isDepositMode,
      arbTokenBridgeLoaded,
      arbTokenBridge: { eth, token, walletAddress },
      arbTokenBridge,
      transactions,
      warningTokens
    }
  } = useAppState()
  const { provider, account } = useWallet()
  const latestConnectedProvider = useLatest(provider)

  const networksAndSigners = useNetworksAndSigners()
  const latestNetworksAndSigners = useLatest(networksAndSigners)
  const {
    l1: { network: l1Network, provider: l1Provider },
    l2: { network: l2Network, provider: l2Provider }
  } = networksAndSigners
  const dispatch = useAppContextDispatch()

  const { isMainnet } = isNetwork(l1Network)
  const { isArbitrumNova } = isNetwork(l2Network)

  const latestEth = useLatest(eth)
  const latestToken = useLatest(token)

  const l1NetworkID = useMemo(() => String(l1Network.chainID), [l1Network])
  const l2NetworkID = useMemo(() => String(l2Network.chainID), [l2Network])

  const [transferring, setTransferring] = useState(false)

  const isSwitchingL2Chain = useIsSwitchingL2Chain()

  const txLifecycleOnTxFailure = useCallback(
    (txHash: string) => {
      transactions.setTransactionFailure(txHash)
    },
    [transactions]
  )

  // Link the amount state directly to the amount in query params -  no need of useState
  // Both `amount` getter and setter will internally be useing useArbQueryParams functions
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
    eth: [ethL1Balance]
  } = useBalance({ provider: l1Provider, walletAddress })
  const {
    eth: [ethL2Balance]
  } = useBalance({ provider: l2Provider, walletAddress })

  const ethBalance = useMemo(() => {
    return isDepositMode ? ethL1Balance : ethL2Balance
  }, [ethL1Balance, ethL2Balance, isDepositMode])

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

    if (typeof arbTokenBridge.balances !== 'undefined') {
      if (!ethL1Balance) {
        return
      }

      const isLowBalance = ethL1Balance.lte(utils.parseEther('0.005'))

      if (isMainnet && isDepositMode && isLowBalance) {
        openLowBalanceDialog()
      }
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
      const balanceL1 =
        arbTokenBridge?.balances?.erc20[selectedToken.address]?.balance
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
  }, [ethL1Balance, selectedToken, arbTokenBridge])

  const l2Balance = useMemo(() => {
    if (selectedToken) {
      const balanceL2 =
        arbTokenBridge?.balances?.erc20[selectedToken.address]?.arbChainBalance
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
  }, [ethL2Balance, selectedToken, arbTokenBridge])

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
          typeof selectedToken.listID === 'undefined' &&
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

    setTransferring(true)

    try {
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
            `${selectedToken.address} is ${description}; it will likely have unusual behavior when deployed as as standard token to Arbitrum. It is not recommended that you deploy it. (See https://developer.offchainlabs.com/docs/bridging_assets for more info.)`
          )
        }
        if (latestNetworksAndSigners.current.isConnectedToArbitrum) {
          trackEvent('Switch Network and Transfer')
          await changeNetwork?.(latestNetworksAndSigners.current.l1.network)

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

          const { allowance } = await arbTokenBridge.token.getL1TokenData(
            selectedToken.address
          )

          if (!allowance.gte(amountRaw)) {
            const waitForInput = openTokenApprovalDialog()
            const confirmed = await waitForInput()

            if (!confirmed) {
              return
            }

            await latestToken.current.approve({
              erc20L1Address: selectedToken.address,
              l1Signer: latestNetworksAndSigners.current.l1.signer,
              txLifecycle: {
                onTxSubmit: ({ tx, symbol }) => {
                  transactions.addTransaction({
                    type: 'approve',
                    status: 'pending',
                    value: null,
                    txID: tx.hash,
                    assetName: symbol,
                    assetType: AssetType.ERC20,
                    sender: walletAddress,
                    l1NetworkID
                  })
                },
                onTxSuccess: ({ tx, txReceipt }) => {
                  transactions.updateTransaction(txReceipt, tx)
                },
                onTxFailure: txHash => txLifecycleOnTxFailure(txHash)
              }
            })
          }

          if (isNonCanonicalToken) {
            const waitForInput = openDepositConfirmationDialog()
            const confirmed = await waitForInput()

            if (!confirmed) {
              return
            }
          }

          await latestToken.current.deposit({
            erc20L1Address: selectedToken.address,
            amount: amountRaw,
            l1Signer: latestNetworksAndSigners.current.l1.signer,
            txLifecycle: {
              onL1TxSubmit: ({ tx, symbol }) => {
                transactions.addTransaction({
                  type: 'deposit-l1',
                  status: 'pending',
                  value: utils.formatUnits(amountRaw, decimals),
                  txID: tx.hash,
                  assetName: symbol,
                  assetType: AssetType.ERC20,
                  tokenAddress: selectedToken.address,
                  sender: walletAddress,
                  l1NetworkID,
                  l2NetworkID
                })
                dispatch({
                  type: 'layout.set_is_transfer_panel_visible',
                  payload: false
                })
              },
              onL1TxSuccess: ({ tx, txReceipt, l1Tol2Message }) => {
                const l1ToL2MsgData: L1ToL2MessageData = {
                  fetchingUpdate: false,
                  status: L1ToL2MessageStatus.NOT_YET_CREATED, //** we know its not yet created, we just initiated it */
                  retryableCreationTxID: l1Tol2Message.retryableCreationId,
                  l2TxID: undefined
                }
                transactions.updateTransaction(txReceipt, tx, l1ToL2MsgData)
              },
              onL1TxFailure: txHash => txLifecycleOnTxFailure(txHash)
            }
          })
        } else {
          const amountRaw = utils.parseUnits(amount, 18)

          await latestEth.current.deposit({
            amount: amountRaw,
            l1Signer: latestNetworksAndSigners.current.l1.signer,
            txLifecycle: {
              onL1TxSubmit: ({ tx }) => {
                transactions.addTransaction({
                  type: 'deposit-l1',
                  status: 'pending',
                  value: utils.formatEther(amountRaw),
                  txID: tx.hash,
                  assetName: 'ETH',
                  assetType: AssetType.ETH,
                  sender: walletAddress,
                  l1NetworkID,
                  l2NetworkID
                })
                dispatch({
                  type: 'layout.set_is_transfer_panel_visible',
                  payload: false
                })
              },
              onL1TxSuccess: ({ tx, txReceipt, ethDepositMessage }) => {
                const l1ToL2MsgData: L1ToL2MessageData = {
                  fetchingUpdate: false,
                  status: L1ToL2MessageStatus.NOT_YET_CREATED,
                  retryableCreationTxID: ethDepositMessage.l2DepositTxHash,
                  l2TxID: undefined
                }
                transactions.updateTransaction(txReceipt, tx, l1ToL2MsgData)
              },
              onL1TxFailure: txHash => txLifecycleOnTxFailure(txHash)
            }
          })
        }
      } else {
        if (!latestNetworksAndSigners.current.isConnectedToArbitrum) {
          trackEvent('Switch Network and Transfer')
          await changeNetwork?.(latestNetworksAndSigners.current.l2.network)

          while (
            !latestNetworksAndSigners.current.isConnectedToArbitrum ||
            !latestEth.current ||
            !arbTokenBridgeLoaded
          ) {
            await new Promise(r => setTimeout(r, 100))
          }

          await new Promise(r => setTimeout(r, 3000))
        }

        const waitForInput = openWithdrawalConfirmationDialog()
        const confirmed = await waitForInput()

        if (!confirmed) {
          return
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
              await latestToken.current.approveL2({
                erc20L1Address: selectedToken.address,
                l2Signer: latestNetworksAndSigners.current.l2.signer,
                txLifecycle: {
                  onTxSubmit: ({ tx, symbol }) => {
                    transactions.addTransaction({
                      type: 'approve-l2',
                      status: 'pending',
                      value: null,
                      txID: tx.hash,
                      assetName: symbol,
                      assetType: AssetType.ERC20,
                      sender: walletAddress,
                      blockNumber: tx.blockNumber,
                      l1NetworkID,
                      l2NetworkID
                    })
                  },
                  onTxSuccess: ({ tx, txReceipt }) => {
                    transactions.updateTransaction(txReceipt, tx)
                  },
                  onTxFailure: txHash => txLifecycleOnTxFailure(txHash)
                }
              })
            }
          }

          await latestToken.current.withdraw({
            erc20L1Address: selectedToken.address,
            amount: amountRaw,
            l2Signer: latestNetworksAndSigners.current.l2.signer,
            txLifecycle: {
              onL2TxSubmit: ({ tx, symbol }) => {
                transactions.addTransaction({
                  type: 'withdraw',
                  status: 'pending',
                  value: utils.formatUnits(amountRaw, decimals),
                  txID: tx.hash,
                  assetName: symbol,
                  assetType: AssetType.ERC20,
                  sender: walletAddress,
                  blockNumber: tx.blockNumber,
                  l1NetworkID,
                  l2NetworkID
                })
                dispatch({
                  type: 'layout.set_is_transfer_panel_visible',
                  payload: false
                })
              },
              onL2TxSuccess: ({ tx, txReceipt }) => {
                transactions.updateTransaction(txReceipt, tx)
              },
              onL2TxFailure: txHash => txLifecycleOnTxFailure(txHash)
            }
          })
        } else {
          const amountRaw = utils.parseUnits(amount, 18)

          await latestEth.current.withdraw({
            amount: amountRaw,
            l2Signer: latestNetworksAndSigners.current.l2.signer,
            txLifecycle: {
              onL2TxSubmit: ({ tx }) => {
                transactions.addTransaction({
                  type: 'withdraw',
                  status: 'pending',
                  value: utils.formatEther(amountRaw),
                  txID: tx.hash,
                  assetName: 'ETH',
                  assetType: AssetType.ETH,
                  sender: walletAddress,
                  blockNumber: tx.blockNumber,
                  l1NetworkID,
                  l2NetworkID
                })
                dispatch({
                  type: 'layout.set_is_transfer_panel_visible',
                  payload: false
                })
              },
              onL2TxSuccess: ({ tx, txReceipt }) => {
                transactions.updateTransaction(txReceipt, tx)
              },
              onL2TxFailure: txHash => txLifecycleOnTxFailure(txHash)
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
      return utils.parseUnits(amount || '0', selectedToken?.decimals || 18)
    } catch (error) {
      return BigNumber.from(0)
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
      transferring ||
      !amountNum ||
      (isDepositMode &&
        !isBridgingANewStandardToken &&
        (!amountNum || !l1Balance || amountNum > +l1Balance)) ||
      // allow 0-amount deposits when bridging new token
      (isDepositMode &&
        isBridgingANewStandardToken &&
        (l1Balance === null || amountNum > +l1Balance))
    )
  }, [
    transferring,
    isDepositMode,
    l2Network,
    amountNum,
    l1Balance,
    isBridgingANewStandardToken,
    selectedToken
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
      transferring ||
      (!isDepositMode && (!amountNum || !l2Balance || amountNum > +l2Balance))
    )
  }, [transferring, isDepositMode, amountNum, l2Balance, selectedToken])

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

    if (transferring) {
      return true
    }

    return !(isDepositMode ? disableDeposit : disableWithdrawal)
  }, [
    isSwitchingL2Chain,
    gasEstimationStatus,
    transferring,
    isDepositMode,
    disableDeposit,
    disableWithdrawal
  ])

  return (
    <>
      <TokenApprovalDialog
        {...tokenApprovalDialogProps}
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
        />

        <div className="border-r border-gray-3" />

        <div
          style={
            isSummaryVisible
              ? {}
              : {
                  background: `url(/images/ArbitrumFaded.png)`,
                  backgroundSize: 'contain',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'center'
                }
          }
          className="flex w-full flex-col justify-between bg-gray-3 px-6 py-6 lg:rounded-tr-xl lg:rounded-br-xl lg:bg-white lg:px-0 lg:pr-6"
        >
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

          {isDepositMode ? (
            <Button
              variant="primary"
              loading={transferring}
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
              Move funds to {getNetworkName(l2Network)}
            </Button>
          ) : (
            <Button
              variant="primary"
              loading={transferring}
              disabled={isSwitchingL2Chain || disableWithdrawalV2}
              onClick={transfer}
              className="w-full bg-purple-ethereum py-4 text-lg lg:text-2xl"
            >
              Move funds to {getNetworkName(l1Network)}
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
      </div>
    </>
  )
}
