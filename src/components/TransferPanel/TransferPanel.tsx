import React, { useContext, useState } from 'react'

import { useLatest } from 'react-use'

import { useAppState } from '../../state'
import { BridgeContext } from '../App/App'
import { Button } from '../common/Button'
import { NetworkSwitchButton } from '../common/NetworkSwitchButton'
import { StatusBadge } from '../common/StatusBadge'
import { TokenModal } from '../TokenModal/TokenModal'
import { AmountBox } from './AmountBox'
import { NetworkBox } from './NetworkBox'

const TransferPanel = (): JSX.Element => {
  const {
    app: {
      changeNetwork,
      selectedToken,
      isDepositMode,
      networkDetails,
      pendingTransactions,
      arbTokenBridgeLoaded,
      arbTokenBridge: { eth, token, bridgeTokens }
    }
  } = useAppState()
  const bridge = useContext(BridgeContext)
  // const [tokeModalOpen, setTokenModalOpen] = useState(false)
  const latestEth = useLatest(eth)
  const latestToken = useLatest(token)
  const latestNetworkDetails = useLatest(networkDetails)

  const [depositing, setDepositing] = useState(false)

  const [l1Amount, setl1Amount] = useState<string>('')
  const [l2Amount, setl2Amount] = useState<string>('')

  const deposit = async () => {
    setDepositing(true)
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
          // TODO allowed returns false even after approval
          if (!bridgeTokens[selectedToken.address]?.allowed) {
            await latestToken.current.approve(selectedToken.address)
          }
          latestToken.current.deposit(selectedToken.address, amount)
        } else {
          latestEth.current.deposit(amount)
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
          if (!bridgeTokens[selectedToken.address]?.allowed) {
            await latestToken.current.approve(selectedToken.address)
          }
          latestToken.current.withdraw(selectedToken.address, amount)
        } else {
          latestEth.current.withdraw(amount)
        }
      }
    } catch (ex) {
      console.log(ex)
    } finally {
      setDepositing(false)
    }
  }

  return (
    <>
      {/* <TokenModal isOpen={tokeModalOpen} setIsOpen={setTokenModalOpen} /> */}

      <div className="flex justify-end max-w-networkBox w-full mx-auto mb-4">
        {/* <button */}
        {/*  type="button" */}
        {/*  onClick={() => setTokenModalOpen(true)} */}
        {/*  className="bg-white border border-gray-300 shadow-sm rounded-md py-2 px-4" */}
        {/* > */}
        {/*  Token: {selectedToken ? selectedToken.symbol : 'Eth'} */}
        {/* </button> */}
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
              {/* <div className="mr-4"> */}
              {/*  <AmountBox amount={l1Amount} setAmount={setl1Amount} /> */}
              {/* </div> */}
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
        {isDepositMode ? (
          <Button
            onClick={deposit}
            disabled={depositing || (isDepositMode && l1Amount === '')}
            isLoading={depositing}
          >
            Deposit
          </Button>
        ) : (
          <Button
            onClick={deposit}
            disabled={depositing || (!isDepositMode && l2Amount === '')}
            variant="navy"
            isLoading={depositing}
          >
            Withdraw
          </Button>
        )}
      </div>
    </>
  )
}

export { TransferPanel }
