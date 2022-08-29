import { useState, useMemo, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { useWallet } from '@arbitrum/use-wallet'
import { utils } from 'ethers'
import { isAddress } from 'ethers/lib/utils'
import { useLatest } from 'react-use'
import { twMerge } from 'tailwind-merge'

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
import useL2Approve from './useL2Approve'
import { BigNumber } from 'ethers'
import { ERC20__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ERC20__factory'
import { ArbTokenBridge } from 'token-bridge-sdk'
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
import { CanonicalTokensBridgeInfo } from 'src/util/fastBridges'

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
  const { search } = useLocation()

  const searchParams = new URLSearchParams(search)
  const tokenFromSearchParams = searchParams.get('token')?.toLowerCase()

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
      arbTokenBridge: { eth, token, bridgeTokens, walletAddress },
      arbTokenBridge,
      warningTokens
    }
  } = useAppState()
  const { provider, account } = useWallet()
  const latestConnectedProvider = useLatest(provider)

  const networksAndSigners = useNetworksAndSigners()
  const latestNetworksAndSigners = useLatest(networksAndSigners)
  const {
    l1: { network: l1Network },
    l2: { network: l2Network, signer: l2Signer }
  } = networksAndSigners
  const dispatch = useAppContextDispatch()

  const { isMainnet } = isNetwork(l1Network)
  const { isArbitrumNova } = isNetwork(l2Network)

  const latestEth = useLatest(eth)
  const latestToken = useLatest(token)

  const [transferring, setTransferring] = useState(false)

  const [l1Amount, setL1AmountState] = useState<string>('')
  const [l2Amount, setL2AmountState] = useState<string>('')

  const isSwitchingL2Chain = useIsSwitchingL2Chain()
  const { shouldRequireApprove } = useL2Approve()

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

  // The amount of funds to bridge over, represented as a floating point number
  const amount = useMemo(() => {
    if (isDepositMode) {
      return parseFloat(l1Amount || '0')
    }

    return parseFloat(l2Amount || '0')
  }, [isDepositMode, l1Amount, l2Amount])

  const ethBalance = useMemo(() => {
    if (!arbTokenBridge || !arbTokenBridge.balances) {
      return null
    }

    return isDepositMode
      ? arbTokenBridge.balances.eth.balance
      : arbTokenBridge.balances.eth.arbChainBalance
  }, [isDepositMode, arbTokenBridge])

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

  const setl1Amount = (amount: string) => {
    const amountNum = +amount
    return setL1AmountState(
      Number.isNaN(amountNum) || amountNum < 0 ? '0' : amount
    )
  }
  const setl2Amount = (amount: string) => {
    const amountNum = +amount
    return setL2AmountState(
      Number.isNaN(amountNum) || amountNum < 0 ? '0' : amount
    )
  }

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
      const ethBalance = arbTokenBridge.balances.eth.balance

      if (ethBalance) {
        const isLowBalance = ethBalance.lte(utils.parseEther('0.005'))

        if (isMainnet && isDepositMode && isLowBalance) {
          openLowBalanceDialog()
        }
      }
    }
  }, [
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
    const ethBalanceL1 = arbTokenBridge?.balances?.eth?.balance
    if (!ethBalanceL1) {
      return null
    }
    return utils.formatUnits(ethBalanceL1, 18)
  }, [selectedToken, arbTokenBridge, bridgeTokens])

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
    const ethBalanceL2 = arbTokenBridge?.balances?.eth?.arbChainBalance
    if (!ethBalanceL2) {
      return null
    }
    return utils.formatUnits(ethBalanceL2, 18)
  }, [selectedToken, arbTokenBridge, bridgeTokens])

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
      const amount = isDepositMode ? l1Amount : l2Amount

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

            await latestToken.current.approve(selectedToken.address)
          }

          if (
            Object.keys(CanonicalTokensBridgeInfo).includes(
              selectedToken.symbol
            )
          ) {
            const waitForInput = openDepositConfirmationDialog()
            const confirmed = await waitForInput()

            if (!confirmed) {
              return
            }
          }

          await latestToken.current.deposit(selectedToken.address, amountRaw, {
            onTxSubmit: () => {
              dispatch({
                type: 'layout.set_is_transfer_panel_visible',
                payload: false
              })
            }
          })
        } else {
          const amountRaw = utils.parseUnits(amount, 18)

          await latestEth.current.deposit(amountRaw, {
            onTxSubmit: () => {
              dispatch({
                type: 'layout.set_is_transfer_panel_visible',
                payload: false
              })
            }
          })
        }
      } else {
        const waitForInput = openWithdrawalConfirmationDialog()
        const confirmed = await waitForInput()

        if (!confirmed) {
          return
        }

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
            shouldRequireApprove &&
            selectedToken.l2Address &&
            l2Signer?.provider
          ) {
            const allowed = await isAllowedL2(
              arbTokenBridge,
              selectedToken.address,
              selectedToken.l2Address,
              walletAddress,
              amountRaw,
              l2Signer.provider
            )
            if (!allowed) {
              await latestToken.current.approveL2(selectedToken.address)
            }
          }

          await latestToken.current.withdraw(selectedToken.address, amountRaw, {
            onTxSubmit: () => {
              dispatch({
                type: 'layout.set_is_transfer_panel_visible',
                payload: false
              })
            }
          })
        } else {
          const amountRaw = utils.parseUnits(amount, 18)
          await latestEth.current.withdraw(amountRaw, {
            onTxSubmit: () => {
              dispatch({
                type: 'layout.set_is_transfer_panel_visible',
                payload: false
              })
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
      return utils.parseUnits(
        isDepositMode ? l1Amount || '0' : l2Amount || '0',
        selectedToken?.decimals || 18
      )
    } catch (error) {
      return BigNumber.from(0)
    }
  }, [isDepositMode, l1Amount, l2Amount, selectedToken])

  // Only run gas estimation when it makes sense, i.e. when there is enough funds
  const shouldRunGasEstimation = useMemo(
    () =>
      isDepositMode
        ? Number(l1Amount) <= Number(l1Balance)
        : Number(l2Amount) <= Number(l2Balance),
    [isDepositMode, l1Amount, l1Balance, l2Amount, l2Balance]
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
    const l1AmountNum = +l1Amount

    if (
      isDepositMode &&
      selectedToken &&
      isWithdrawOnlyToken(selectedToken.address, l2Network.chainID)
    ) {
      return true
    }

    return (
      transferring ||
      l1Amount.trim() === '' ||
      (isDepositMode &&
        !isBridgingANewStandardToken &&
        (!l1AmountNum || !l1Balance || l1AmountNum > +l1Balance)) ||
      // allow 0-amount deposits when bridging new token
      (isDepositMode &&
        isBridgingANewStandardToken &&
        (l1Balance === null || l1AmountNum > +l1Balance))
    )
  }, [transferring, isDepositMode, l2Network, l1Amount, l1Balance])

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

    return (
      Number(l1Amount) + gasSummary.estimatedTotalGasFees > Number(l1Balance)
    )
  }, [
    ethBalance,
    disableDeposit,
    selectedToken,
    gasSummary,
    l1Amount,
    l1Balance
  ])

  const disableWithdrawal = useMemo(() => {
    const l2AmountNum = +l2Amount

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
      (!isDepositMode &&
        (!l2AmountNum || !l2Balance || l2AmountNum > +l2Balance))
    )
  }, [transferring, isDepositMode, l2Amount, l2Balance, selectedToken])

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

    return (
      Number(l2Amount) + gasSummary.estimatedTotalGasFees > Number(l2Balance)
    )
  }, [
    ethBalance,
    disableWithdrawal,
    selectedToken,
    gasSummary,
    l2Amount,
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

      <WithdrawalConfirmationDialog {...withdrawalConfirmationDialogProps} />

      <DepositConfirmationDialog {...depositConfirmationDialogProps} />

      <LowBalanceDialog {...lowBalanceDialogProps} />

      <div className="flex max-w-screen-lg flex-col space-y-6 bg-white shadow-[0px_4px_20px_rgba(0,0,0,0.2)] lg:flex-row lg:space-y-0 lg:space-x-6 lg:rounded-xl">
        <TransferPanelMain
          amount={isDepositMode ? l1Amount : l2Amount}
          setAmount={isDepositMode ? setl1Amount : setl2Amount}
          errorMessage={
            isDepositMode
              ? getErrorMessage(l1Amount, l1Balance)
              : getErrorMessage(l2Amount, l2Balance)
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
              amount={amount}
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
