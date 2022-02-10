import React, { useContext, useState, useMemo, useCallback } from 'react'

import { useWallet } from '@gimmixorg/use-wallet'
import { utils, BigNumber } from 'ethers'
import Loader from 'react-loader-spinner'
import { useLatest } from 'react-use'
import { ERC20__factory, Bridge } from 'token-bridge-sdk'

import { useAppState } from '../../state'
import { PendingWithdrawalsLoadedState } from '../../util'
import { BridgeContext } from '../App/App'
import { Button } from '../common/Button'
import { NetworkSwitchButton } from '../common/NetworkSwitchButton'
import { StatusBadge } from '../common/StatusBadge'
import TransactionConfirmationModal from '../TransactionConfirmationModal/TransactionConfirmationModal'
import { NetworkBox } from './NetworkBox'
import useWithdrawOnly from './useWithdrawOnly'

const isAllowed = async (
  bridge: Bridge,
  l1TokenAddress: string,
  amountNeeded: BigNumber
) => {
  const token = ERC20__factory.connect(l1TokenAddress, bridge.l1Provider)
  const walletAddress = await bridge.l1Bridge.getWalletAddress()
  const gatewayAddress = await bridge.l1Bridge.getGatewayAddress(l1TokenAddress)
  return (await token.allowance(walletAddress, gatewayAddress)).gte(
    amountNeeded
  )
}
const TransferPanel = (): JSX.Element => {
  const [confirmationOpen, setConfirmationOpen] = useState(false)
  const {
    app: {
      pwLoadedState,
      changeNetwork,
      selectedToken,
      isDepositMode,
      networkDetails,
      l1NetworkDetails,
      l2NetworkDetails,
      pendingTransactions,
      arbTokenBridgeLoaded,
      arbTokenBridge: { eth, token, bridgeTokens },
      arbTokenBridge,
      warningTokens
    }
  } = useAppState()
  const { provider } = useWallet()
  const latestConnectedProvider = useLatest(provider)

  const bridge = useContext(BridgeContext)
  // const [tokeModalOpen, setTokenModalOpen] = useState(false)
  const latestEth = useLatest(eth)
  const latestToken = useLatest(token)
  const latestNetworkDetails = useLatest(networkDetails)

  const [transferring, setTransferring] = useState(false)

  const [l1Amount, setL1AmountState] = useState<string>('')
  const [l2Amount, setL2AmountState] = useState<string>('')
  const { shouldDisableDeposit } = useWithdrawOnly()
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

  const showBridgeInstructions = useCallback(() => {
    if (
      l1NetworkDetails &&
      l1NetworkDetails.chainID === '1' &&
      isDepositMode &&
      selectedToken &&
      !selectedToken.l2Address
    ) {
      return alert(
        `${selectedToken.symbol} has not yet been bridged to L2; to bridge it yourself, see https://developer.offchainlabs.com/docs/bridging_assets#default-standard-bridging`
      )
    }
    return setConfirmationOpen(true)
  }, [selectedToken, isDepositMode, l1NetworkDetails])

  const transfer = async () => {
    // ** We can be assured bridge won't be null here; this is to appease typescript*/
    if (!bridge) {
      // eslint-disable-next-line no-alert
      alert("Bridge null! This shouldn't happen. Let support know.")
      return
    }
    setTransferring(true)
    try {
      const amount = isDepositMode ? l1Amount : l2Amount
      if (isDepositMode) {
        if (selectedToken && !selectedToken.l2Address) {
          return alert(
            `${selectedToken.symbol} has not yet been bridged to L2; to bridge it yourself, see https://developer.offchainlabs.com/docs/bridging_assets#default-standard-bridging`
          )
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
          // eslint-disable-next-line no-restricted-globals
          const res = confirm(
            `${selectedToken.address} is ${description}; it will likely have unusual behavior when deployed as as standard token to Arbitrum. It is not recommended that you deploy it. (See https://developer.offchainlabs.com/docs/bridging_assets for more info.) Are you sure you would like to proceed?`
          )
          if (!res) {
            return
          }
        }
        if (networkDetails?.isArbitrum === true) {
          await changeNetwork?.(networkDetails.partnerChainID)
          while (
            latestNetworkDetails.current?.isArbitrum ||
            !latestEth.current ||
            !arbTokenBridgeLoaded ||
            !bridge
          ) {
            await new Promise(r => setTimeout(r, 100))
          }
          await new Promise(r => setTimeout(r, 3000))
        }

        const l1ChainID = l1NetworkDetails?.chainID
        const connectedChainID =
          latestConnectedProvider.current?.network?.chainId
        if (
          !(l1ChainID && connectedChainID && +l1ChainID === connectedChainID)
        ) {
          return alert('Network connection issue; contact support')
        }
        if (selectedToken) {
          const { decimals } = selectedToken
          const amountRaw = utils.parseUnits(amount, decimals)

          // check that a registration is not currently in progress
          const l2RoutedAddress = (
            await bridge.l2Bridge.l2GatewayRouter.functions.calculateL2TokenAddress(
              selectedToken.address
            )
          )[0]

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

          if (!bridgeTokens[selectedToken.address]?.allowed) {
            // ** Sanity check: ensure not allowed yet  */
            const allowed = await isAllowed(
              bridge,
              selectedToken.address,
              amountRaw
            )
            if (!allowed) {
              await latestToken.current.approve(selectedToken.address)
            }
          }
          await latestToken.current.deposit(selectedToken.address, amountRaw)
        } else {
          const amountRaw = utils.parseUnits(amount, 18)
          await latestEth.current.deposit(amountRaw)
        }
      } else {
        if (networkDetails?.isArbitrum === false) {
          await changeNetwork?.(networkDetails.partnerChainID)
          while (
            !latestNetworkDetails.current?.isArbitrum ||
            !latestEth.current ||
            !arbTokenBridgeLoaded ||
            !bridge
          ) {
            await new Promise(r => setTimeout(r, 100))
          }
          await new Promise(r => setTimeout(r, 3000))
        }

        const l2ChainID = l2NetworkDetails?.chainID
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
      (isDepositMode &&
        (!l1AmountNum || !l1Balance || l1AmountNum > +l1Balance))
    )
  }, [transferring, isDepositMode, l1Amount, l1Balance])

  const disableWithdrawal = useMemo(() => {
    const l2AmountNum = +l2Amount
    return (
      (selectedToken &&
        selectedToken.address &&
        selectedToken.address.toLowerCase() ===
          '0x0e192d382a36de7011f795acc4391cd302003606'.toLowerCase()) ||
      transferring ||
      (!isDepositMode &&
        (!l2AmountNum || !l2Balance || l2AmountNum > +l2Balance))
    )
  }, [transferring, isDepositMode, l2Amount, l2Balance, selectedToken])

  return (
    <>
      <div className="flex justify-between items-end gap-4 flex-wrap max-w-networkBox w-full mx-auto mb-4 min-h-10">
        <div>
          {pwLoadedState === PendingWithdrawalsLoadedState.LOADING && (
            <div>
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
            <div>
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
      <div className="flex flex-col w-full max-w-networkBox mx-auto mb-8">
        <div className="flex flex-col">
          <NetworkBox
            isL1
            amount={l1Amount}
            setAmount={setl1Amount}
            className={isDepositMode ? 'order-1' : 'order-3'}
          />
          <div className="h-2 relative flex justify-center order-2 w-full">
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

        <div className="h-6" />

        <TransactionConfirmationModal
          onConfirm={transfer}
          open={confirmationOpen}
          setOpen={setConfirmationOpen}
          isDepositing={isDepositMode}
          symbol={selectedToken ? selectedToken.symbol : 'Eth'}
          amount={isDepositMode ? l1Amount : l2Amount}
        />
        {isDepositMode ? (
          <Button
            onClick={showBridgeInstructions}
            disabled={disableDeposit}
            isLoading={transferring}
          >
            Deposit
          </Button>
        ) : (
          <Button
            onClick={() => setConfirmationOpen(true)}
            disabled={disableWithdrawal}
            variant="navy"
            isLoading={transferring}
          >
            Withdraw
          </Button>
        )}
      </div>
    </>
  )
}

export { TransferPanel }
