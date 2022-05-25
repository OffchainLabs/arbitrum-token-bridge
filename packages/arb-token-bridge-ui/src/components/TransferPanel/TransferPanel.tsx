import { useState, useMemo, useCallback, useEffect } from 'react'
import { useLocation } from 'react-router-dom'

import { useWallet } from '@arbitrum/use-wallet'
import { utils } from 'ethers'
import { isAddress } from 'ethers/lib/utils'
import Loader from 'react-loader-spinner'
import { useLatest } from 'react-use'

import { useAppState } from '../../state'
import { ConnectionState, PendingWithdrawalsLoadedState } from '../../util'
import { Button } from '../common/Button'
import { NetworkSwitchButton } from '../common/NetworkSwitchButton'
import { StatusBadge } from '../common/StatusBadge'
import TransactionConfirmationModal, {
  ModalStatus
} from '../TransactionConfirmationModal/TransactionConfirmationModal'
import { TokenImportModal } from '../TokenModal/TokenImportModal'
import { NetworkBox } from './NetworkBox'
import useWithdrawOnly from './useWithdrawOnly'
import {
  useNetworksAndSigners,
  UseNetworksAndSignersStatus
} from '../../hooks/useNetworksAndSigners'
import useL2Approve from './useL2Approve'
import { BigNumber } from 'ethers'
import { ERC20__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ERC20__factory'
import { ArbTokenBridge } from 'token-bridge-sdk'
import { JsonRpcProvider } from '@ethersproject/providers'
import { useETHPrice } from '../../hooks/useETHPrice'

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

const TransferPanel = (): JSX.Element => {
  const tokenFromSearchParams = useTokenFromSearchParams()

  const [confimationModalStatus, setConfirmationModalStatus] =
    useState<ModalStatus>(ModalStatus.CLOSED)
  const [importTokenModalStatus, setImportTokenModalStatus] =
    useState<ImportTokenModalStatus>(ImportTokenModalStatus.IDLE)

  const {
    app: {
      connectionState,
      pwLoadedState,
      changeNetwork,
      selectedToken,
      isDepositMode,
      pendingTransactions,
      arbTokenBridgeLoaded,
      arbTokenBridge: { eth, token, bridgeTokens, walletAddress },
      arbTokenBridge,
      warningTokens
    }
  } = useAppState()
  const { provider } = useWallet()
  const latestConnectedProvider = useLatest(provider)

  const networksAndSigners = useNetworksAndSigners()
  const latestNetworksAndSigners = useLatest(networksAndSigners)
  const {
    l1: { network: l1Network },
    l2: { network: l2Network, signer: l2Signer }
  } = networksAndSigners

  const latestEth = useLatest(eth)
  const latestToken = useLatest(token)

  const [transferring, setTransferring] = useState(false)

  const [l1Amount, setL1AmountState] = useState<string>('')
  const [l2Amount, setL2AmountState] = useState<string>('')

  const { shouldDisableDeposit } = useWithdrawOnly()
  const { shouldRequireApprove } = useL2Approve()

  const ethPrice = useETHPrice()

  const toUSD = useCallback(
    (etherValue: number) => {
      const safeETHPrice = typeof ethPrice === 'number' ? ethPrice : 0
      return (etherValue * safeETHPrice).toLocaleString()
    },
    [ethPrice]
  )

  // TODO: Switch to a value provided by @arbitrum/sdk
  const [estimatedL1Gas, setEstimatedL1Gas] = useState(BigNumber.from(100000))
  // Estimated L1 gas fees, denominated in Ether, represented as a floating point number
  const [estimatedL1GasFees, setEstimatedL1GasFees] = useState(0)

  // TODO: Switch to a value provided by @arbitrum/sdk
  const [estimatedL2Gas, setEstimatedL2Gas] = useState(BigNumber.from(1000000))
  // Estimated L2 gas fees, denominated in Ether, represented as a floating point number
  const [estimatedL2GasFees, setEstimatedL2GasFees] = useState(0)

  // Estimated total gas fees, denominated in Ether, represented as a floating point number
  const estimatedTotalGasFees = useMemo(
    () => estimatedL1GasFees + estimatedL2GasFees,
    [estimatedL1GasFees, estimatedL2GasFees]
  )

  // The amount of funds to bridge over, represented as a floating point number
  const amount = useMemo(() => {
    if (isDepositMode) {
      return parseFloat(l1Amount || '0')
    }

    return parseFloat(l2Amount || '0')
  }, [isDepositMode, l1Amount, l2Amount])

  useEffect(() => {
    async function fetchGasPrices() {
      const {
        l1: { signer: l1Signer },
        l2: { signer: l2Signer }
      } = networksAndSigners

      if (typeof l1Signer === 'undefined' || typeof l2Signer === 'undefined') {
        return
      }

      const [l1GasPrice, l2GasPrice] = await Promise.all([
        l1Signer.getGasPrice(),
        l2Signer.getGasPrice()
      ])

      setEstimatedL1GasFees(
        parseFloat(utils.formatEther(estimatedL1Gas.mul(l1GasPrice)))
      )
      setEstimatedL2GasFees(
        parseFloat(utils.formatEther(estimatedL2Gas.mul(l2GasPrice)))
      )
    }

    fetchGasPrices()
  }, [networksAndSigners, estimatedL1Gas, estimatedL2Gas])

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

  const showModalOnDeposit = useCallback(() => {
    if (isBridgingANewStandardToken) {
      if (!selectedToken)
        throw new Error('Invalid app state: no selected token')
      setConfirmationModalStatus(ModalStatus.NEW_TOKEN_DEPOSITING)
    } else {
      const isAUserAddedToken =
        selectedToken && selectedToken.listID === undefined
      setConfirmationModalStatus(
        isAUserAddedToken ? ModalStatus.USER_ADDED_DEPOSIT : ModalStatus.DEPOSIT
      )
    }
  }, [isBridgingANewStandardToken, selectedToken])

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
            await latestToken.current.approve(selectedToken.address)
          }

          await latestToken.current.deposit(selectedToken.address, amountRaw)
        } else {
          const amountRaw = utils.parseUnits(amount, 18)

          await latestEth.current.deposit(amountRaw)
        }
      } else {
        if (!latestNetworksAndSigners.current.isConnectedToArbitrum) {
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
          latestToken.current.withdraw(selectedToken.address, amountRaw)
        } else {
          const amountRaw = utils.parseUnits(amount, 18)
          latestEth.current.withdraw(amountRaw)
        }
      }
    } catch (ex) {
      console.log(ex)
    } finally {
      setTransferring(false)
    }
  }

  const disableDeposit = useMemo(() => {
    const l1AmountNum = +l1Amount
    return (
      shouldDisableDeposit ||
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
  }, [transferring, isDepositMode, l1Amount, l1Balance])

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

  const isSummaryVisible = useMemo(() => {
    return !(isDepositMode ? disableDeposit : disableWithdrawal)
  }, [isDepositMode, disableDeposit, disableWithdrawal])

  return (
    <>
      <div className="flex justify-between items-end gap-4 flex-wrap max-w-networkBox w-full mx-auto">
        <div>
          {pwLoadedState === PendingWithdrawalsLoadedState.LOADING && (
            <div className="py-2">
              <StatusBadge showDot={false}>
                <div className="mr-2">
                  <Loader
                    type="Oval"
                    color="rgb(45, 55, 75)"
                    height={14}
                    width={14}
                  />
                </div>
                Loading pending withdrawals
              </StatusBadge>
            </div>
          )}
          {pwLoadedState === PendingWithdrawalsLoadedState.ERROR && (
            <div className="py-2">
              <StatusBadge variant="red">
                Loading pending withdrawals failed
              </StatusBadge>
            </div>
          )}
        </div>
        {pendingTransactions?.length > 0 && (
          <StatusBadge>{pendingTransactions?.length} Processing</StatusBadge>
        )}
      </div>

      <div className="flex flex-col lg:flex-row bg-white max-w-screen-lg mx-auto lg:rounded-xl space-y-6 lg:space-y-0 lg:space-x-6 transfer-panel-drop-shadow">
        <div className="transfer-panel-network-box-wrapper flex flex-col px-8 lg:px-0 lg:pl-8 pt-6">
          <NetworkBox
            isL1
            amount={l1Amount}
            setAmount={setl1Amount}
            className={isDepositMode ? 'order-1' : 'order-3'}
          />
          <div className="h-10 lg:h-12 relative flex justify-center order-2 w-full">
            <div className="flex items-center justify-end relative w-full">
              <div className="absolute left-0 right-0 mx-auto flex items-center justify-center">
                <NetworkSwitchButton />
              </div>
            </div>
          </div>
          <NetworkBox
            isL1={false}
            amount={l2Amount}
            setAmount={setl2Amount}
            className={isDepositMode ? 'order-3' : 'order-1'}
          />
        </div>

        <div className="border-r border-v3-gray-3" />

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
          className="flex flex-col justify-between w-full bg-v3-gray-3 lg:bg-white px-8 lg:px-0 lg:pr-8 py-6"
        >
          <div className="hidden lg:block">
            <span className="text-2xl">Summary</span>
            <div className="h-2" />
          </div>

          {isSummaryVisible ? (
            <>
              <div className="block lg:hidden">
                <span className="text-2xl">Summary</span>
                <div className="h-2" />
              </div>

              <div className="text-lg flex flex-col space-y-1">
                <div className="flex flex-row justify-between">
                  <span className="text-v3-gray-10 font-light w-2/5">
                    Amount
                  </span>
                  <div className="flex flex-row justify-between w-3/5">
                    <span className="text-v3-gray-10 font-light">
                      {selectedToken ? amount : amount.toFixed(4)}{' '}
                      {selectedToken ? selectedToken.symbol : 'ETH'}
                    </span>
                    {/* Only show USD price for ETH. */}
                    {selectedToken === null && (
                      <span className="text-v3-gray-10 font-light">
                        (${toUSD(amount)})
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-row justify-between">
                  <span className="text-v3-gray-10 font-light w-2/5">
                    Total gas
                  </span>
                  <div className="flex flex justify-between w-3/5">
                    <span className="text-v3-gray-10 font-light">
                      {estimatedTotalGasFees.toLocaleString()} ETH
                    </span>
                    <span className="text-v3-gray-10 font-light">
                      (${toUSD(estimatedTotalGasFees)})
                    </span>
                  </div>
                </div>
                <div className="flex flex-row justify-between">
                  <span className="text-v3-gray-6 font-light w-2/5 pl-4">
                    L1 gas
                  </span>
                  <div className="flex flex-row justify-between w-3/5">
                    <span className="text-v3-gray-6 font-light">
                      {estimatedL1GasFees.toLocaleString()} ETH
                    </span>
                    <span className="text-v3-gray-6 font-light">
                      (${toUSD(estimatedL1GasFees)})
                    </span>
                  </div>
                </div>
                <div className="flex flex-row justify-between">
                  <span className="text-v3-gray-6 font-light w-2/5 pl-4">
                    L2 gas
                  </span>
                  <div className="flex flex-row justify-between w-3/5">
                    <span className="text-v3-gray-6 font-light">
                      {estimatedL2GasFees.toLocaleString()} ETH
                    </span>
                    <span className="text-v3-gray-6 font-light">
                      (${toUSD(estimatedL2GasFees)})
                    </span>
                  </div>
                </div>

                {/* Only show totals for ETH. */}
                {selectedToken === null && (
                  <>
                    <div className="h-1" />
                    <div className="border-b border-v3-gray-5 lg:border-v3-gray-3" />
                    <div className="h-1" />
                    <div className="flex flex-row justify-between">
                      <span className="w-2/5">Total</span>
                      <div className="flex flex-row justify-between w-3/5">
                        <span>
                          {(amount + estimatedTotalGasFees).toLocaleString()}{' '}
                          ETH
                        </span>
                        <span>(${toUSD(amount + estimatedTotalGasFees)})</span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="h-12" />
            </>
          ) : (
            <>
              <div className="hidden lg:block min-h-56 text-v3-gray-7 text-lg">
                <span className="text-xl">
                  Bridging summary will appear here.
                </span>
              </div>
              <div style={{ height: '1px' }} />
            </>
          )}

          {isDepositMode ? (
            <Button
              onClick={showModalOnDeposit}
              disabled={disableDeposit}
              isLoading={transferring}
              className="h-16 rounded-xl text-xl bg-v3-arbitrum-dark-blue font-normal text-white"
            >
              Move funds to {l2Network?.name}
            </Button>
          ) : (
            <Button
              onClick={() => setConfirmationModalStatus(ModalStatus.WITHDRAW)}
              disabled={disableWithdrawal}
              variant="navy"
              isLoading={transferring}
              className="h-16 rounded-xl text-xl bg-v3-ethereum-dark-purple font-normal text-white"
            >
              Move funds to {l1Network?.name}
            </Button>
          )}
        </div>

        {typeof tokenFromSearchParams !== 'undefined' && (
          <TokenImportModal
            isOpen={importTokenModalStatus === ImportTokenModalStatus.OPEN}
            setIsOpen={() =>
              setImportTokenModalStatus(ImportTokenModalStatus.CLOSED)
            }
            address={tokenFromSearchParams}
          />
        )}

        <TransactionConfirmationModal
          onConfirm={transfer}
          status={confimationModalStatus}
          closeModal={() => setConfirmationModalStatus(ModalStatus.CLOSED)}
          isDepositing={isDepositMode}
          symbol={selectedToken ? selectedToken.symbol : 'Eth'}
          amount={isDepositMode ? l1Amount : l2Amount}
        />
      </div>

      <div className="h-8" />
    </>
  )
}

export { TransferPanel }
