import React, { useContext, useState, useMemo } from 'react'

import { ERC20__factory, Bridge } from 'arb-ts'
import { utils, BigNumber } from 'ethers'
import Loader from 'react-loader-spinner'
import { useLatest } from 'react-use'

import { useAppState } from '../../state'
import { PendingWithdrawalsLoadedState } from '../../util'
import { BridgeContext } from '../App/App'
import { Button } from '../common/Button'
import { NetworkSwitchButton } from '../common/NetworkSwitchButton'
import { StatusBadge } from '../common/StatusBadge'
import TransactionConfirmationModal from '../TransactionConfirmationModal/TransactionConfirmationModal'
import { NetworkBox } from './NetworkBox'
import useWithdrawOnly from './useWithdrawOnly'

const isAllowed = async (bridge: Bridge, l1TokenAddress: string) => {
  const token = ERC20__factory.connect(l1TokenAddress, bridge.l1Provider)
  const walletAddress = await bridge.l1Bridge.getWalletAddress()
  const gatewayAddress = await bridge.l1Bridge.getGatewayAddress(l1TokenAddress)
  return (await token.allowance(walletAddress, gatewayAddress)).gte(
    BigNumber.from('0xffffffffffffffffffffffff').div(2)
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
      pendingTransactions,
      arbTokenBridgeLoaded,
      arbTokenBridge: { eth, token, bridgeTokens },
      arbTokenBridge
    }
  } = useAppState()

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

  const transfer = async () => {
    // ** We can be assured bridge won't be null here; this is to appease typescript*/
    if (!bridge) {
      alert("Bridge null! This shouldn't happen. Let support know.")
      return
    }
    setTransferring(true)
    try {
      const amount = isDepositMode ? l1Amount : l2Amount
      if (isDepositMode) {
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
        if (selectedToken) {
          if (!bridgeTokens[selectedToken.address]?.allowed) {
            // ** Sanity check: ensure not allowed yet  */
            const allowed = await isAllowed(bridge, selectedToken.address)
            if (!allowed) {
              await latestToken.current.approve(selectedToken.address)
            }
          }
          const { decimals } = selectedToken
          const amountRaw = utils.parseUnits(amount, decimals)
          latestToken.current.deposit(selectedToken.address, amountRaw)
        } else {
          const amountRaw = utils.parseUnits(amount, 18)
          latestEth.current.deposit(amountRaw)
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
      transferring ||
      (!isDepositMode &&
        (!l2AmountNum || !l2Balance || l2AmountNum > +l2Balance))
    )
  }, [transferring, isDepositMode, l2Amount, l2Balance])

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
            onClick={() => setConfirmationOpen(true)}
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
