import { useState, useMemo, useEffect, useCallback } from 'react'
import Tippy from '@tippyjs/react'
import { BigNumber, constants, utils } from 'ethers'
import { isAddress } from 'ethers/lib/utils'
import { useLatest } from 'react-use'
import { twMerge } from 'tailwind-merge'
import * as Sentry from '@sentry/react'
import { useAccount, useProvider, useSigner } from 'wagmi'
import { ERC20__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ERC20__factory'
import { JsonRpcProvider } from '@ethersproject/providers'
import { create } from 'zustand'

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
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { useArbQueryParams } from '../../hooks/useArbQueryParams'
import { useDialog } from '../common/Dialog'
import { TokenApprovalDialog } from './TokenApprovalDialog'
import { WithdrawalConfirmationDialog } from './WithdrawalConfirmationDialog'
import { DepositConfirmationDialog } from './DepositConfirmationDialog'
import { TransferPanelSummary, useGasSummary } from './TransferPanelSummary'
import { useAppContextActions, useAppContextState } from '../App/AppContext'
import { trackEvent, shouldTrackAnalytics } from '../../util/AnalyticsUtils'
import {
  TransferPanelMain,
  TransferPanelMainErrorMessage
} from './TransferPanelMain'
import { useIsSwitchingL2Chain } from './TransferPanelMainUtils'
import { NonCanonicalTokensBridgeInfo } from '../../util/fastBridges'
import { tokenRequiresApprovalOnL2 } from '../../util/L2ApprovalUtils'
import {
  getL1TokenAllowance,
  getL2ERC20Address,
  getL2GatewayAddress,
  isTokenMainnetUSDC
} from '../../util/TokenUtils'
import { useBalance } from '../../hooks/useBalance'
import { useSwitchNetworkWithConfig } from '../../hooks/useSwitchNetworkWithConfig'
import { useIsConnectedToArbitrum } from '../../hooks/useIsConnectedToArbitrum'
import { warningToast } from '../common/atoms/Toast'
import { ExternalLink } from '../common/ExternalLink'
import { useAccountType } from '../../hooks/useAccountType'
import { GET_HELP_LINK } from '../../constants'
import {
  getDestinationAddressError,
  useDestinationAddressStore
} from './AdvancedSettings'
import { USDCDepositConfirmationDialog } from './USDCDeposit/USDCDepositConfirmationDialog'
import { USDCWithdrawalConfirmationDialog } from './USDCWithdrawal/USDCWithdrawalConfirmationDialog'
import { useIsConnectedToL3 } from '../../hooks/useIsConnectedToL3'

const onTxError = (error: any) => {
  if (error.code !== 'ACTION_REJECTED') {
    Sentry.captureException(error)
  }
}

type USDCWithdrawalConfirmationDialogStore = {
  isOpen: boolean
  openDialog: () => void
  closeDialog: () => void
}

export const useUSDCWithdrawalConfirmationDialogStore =
  create<USDCWithdrawalConfirmationDialogStore>(set => ({
    isOpen: false,
    openDialog: () => set({ isOpen: true }),
    closeDialog: () => set({ isOpen: false })
  }))

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
  const gatewayAddress = await getL2GatewayAddress({
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
      arbTokenBridge: { eth, token, walletAddress },
      arbTokenBridge,
      warningTokens
    }
  } = useAppState()
  const { layout } = useAppContextState()
  const { isTransferring } = layout
  const { address: account, isConnected } = useAccount()
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
  const { isArbitrumOne } = isNetwork(l2Network.id)

  const { isEOA = false, isSmartContractWallet = false } = useAccountType()

  const { data: l1Signer } = useSigner({
    chainId: l1Network.id
  })
  const { data: l2Signer } = useSigner({
    chainId: l2Network.id
  })

  const { openTransactionHistoryPanel, setTransferring } =
    useAppContextActions()

  const { isMainnet } = isNetwork(l1Network.id)
  const { isArbitrumNova, isXai } = isNetwork(l2Network.id)

  const latestEth = useLatest(eth)
  const latestToken = useLatest(token)

  const isSwitchingL2Chain = useIsSwitchingL2Chain()
  const isConnectedToArbitrum = useLatest(useIsConnectedToArbitrum())
  const isConnectedToL3 = useLatest(useIsConnectedToL3())

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

  const [tokenCheckDialogProps, openTokenCheckDialog] = useDialog()
  const [tokenApprovalDialogProps, openTokenApprovalDialog] = useDialog()
  const [withdrawalConfirmationDialogProps, openWithdrawalConfirmationDialog] =
    useDialog()
  const [depositConfirmationDialogProps, openDepositConfirmationDialog] =
    useDialog()
  const {
    isOpen: isOpenUSDCWithdrawalConfirmationDialog,
    closeDialog: closeUSDCWithdrawalConfirmationDialog
  } = useUSDCWithdrawalConfirmationDialogStore()
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

  const ethBalance = useMemo(() => {
    return isDepositMode ? ethL1Balance : ethL2Balance
  }, [ethL1Balance, ethL2Balance, isDepositMode])

  const [allowance, setAllowance] = useState<BigNumber | null>(null)

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

    // Don't open when the token import dialog should open
    if (typeof tokenFromSearchParams !== 'undefined') {
      return
    }

    if (!ethL1Balance) {
      return
    }
  }, [
    ethL1Balance,
    account,
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
      const confirmed = await waitForInput()

      if (confirmed) {
        transfer()
      }
    } else {
      transfer()
    }
  }

  const transfer = async () => {
    const signerUndefinedError = 'Signer is undefined'

    if (!isConnected) {
      return
    }

    if (!isEOA && !isSmartContractWallet) {
      console.error('Account type is undefined')
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

    // Check if only L1 and L3 networks are selected.
    // L1 <> L3 transfers aren't enabled.
    // Just in case, UI and SDK should prevent it.
    const areL1AndL3NetworksSelected = [l1Network.id, l2Network.id].every(
      id => {
        const { isEthereum, isL3 } = isNetwork(id)
        return isEthereum || isL3
      }
    )
    if (areL1AndL3NetworksSelected) {
      console.error("Transfers between L1 and L3 aren't supported yet.")
      return
    }

    // SC ETH transfers aren't enabled yet. Safety check, shouldn't be able to get here.
    if (isSmartContractWallet && !selectedToken) {
      console.error("ETH transfers aren't enabled for smart contract wallets.")
      return
    }

    const l2NetworkName = getNetworkName(l2Network.id)

    // SC wallet transfer requests are sent immediately, delay it to give user an impression of a tx sent
    const showDelayedSCTxRequest = () =>
      setTimeout(() => {
        setTransferring(false)
        setShowSCWalletTooltip(true)
      }, 3000)

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
            `${selectedToken?.address} is ${description}; it will likely have unusual behavior when deployed as as standard token to Arbitrum. It is not recommended that you deploy it. (See https://developer.offchainlabs.com/docs/bridging_assets for more info.)`
          )
        }
        if (
          // only connect to L1 if the selected L1 network is Ethereum
          // Arbitrum connection is valid for deposits to L3
          isConnectedToArbitrum.current &&
          isNetwork(l1Network.id).isEthereum
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
            isConnectedToArbitrum.current ||
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
        if (
          !(l1ChainID && connectedChainID && l1ChainID === connectedChainID) &&
          !isNetwork(connectedChainID).isL3
        ) {
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
            const confirmed = await waitForInput()

            if (!confirmed) {
              return
            }
          }

          if (isArbitrumOne && isTokenMainnetUSDC(selectedToken.address)) {
            const waitForInput = openUSDCDepositConfirmationDialog()
            const confirmed = await waitForInput()

            if (!confirmed) {
              return
            }
          }

          // Check token allowance & show modal if needed
          const allowance = await getL1TokenAllowance({
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

        // only switch to L2 if connected to L1, to withdraw from L2 to L1
        if (!isConnectedToArbitrum.current && !isConnectedToL3.current) {
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
            !isConnectedToArbitrum.current ||
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
        isWithdrawOnlyToken(selectedToken.address, l2Network.id)
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
      l2Network,
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
    if (!ethBalance || gasSummary.status !== 'success') {
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
      isWithdrawOnlyToken(selectedToken.address, l2Network.id)
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
    isBridgingANewStandardToken,
    selectedToken,
    amount,
    amountNum,
    l1Balance,
    l2Network.id,
    requiredGasFees
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
    amount,
    amountNum,
    disableDepositAndWithdrawal,
    l2Balance,
    selectedToken,
    requiredGasFees
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

      <USDCWithdrawalConfirmationDialog
        isOpen={isOpenUSDCWithdrawalConfirmationDialog}
        onClose={closeUSDCWithdrawalConfirmationDialog}
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
                if (selectedToken) {
                  depositToken()
                } else {
                  transfer()
                }
              }}
              className={twMerge(
                'w-full bg-eth-dark py-4 text-lg lg:text-2xl',
                isArbitrumNova ? 'bg-arb-nova-dark' : 'bg-arb-one-dark',
                isXai ? 'bg-xai-dark' : ''
              )}
            >
              {isSmartContractWallet && isTransferring
                ? 'Sending request...'
                : `Move funds to ${getNetworkName(l2Network.id)}`}
            </Button>
          ) : (
            <Button
              variant="primary"
              loading={isTransferring}
              disabled={disableWithdrawal}
              onClick={transfer}
              className={twMerge(
                'w-full bg-eth-dark py-4 text-lg lg:text-2xl',
                isConnectedToL3 ? 'bg-arb-one-dark' : ''
              )}
            >
              {isSmartContractWallet && isTransferring
                ? 'Sending request...'
                : `Move funds to ${getNetworkName(l1Network.id)}`}
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
