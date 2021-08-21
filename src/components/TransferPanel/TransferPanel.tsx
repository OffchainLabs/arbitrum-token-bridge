import React, { useState } from 'react'

import { useAppState } from '../../state'
import { Button } from '../common/Button'
import { NetworkSwitchButton } from '../common/NetworkSwitchButton'
import { StatusBadge } from '../common/StatusBadge'
import { TokenModal } from '../TokenModal/TokenModal'
import { NetworkBox } from './NetworkBox'

const TransferPanel = (): JSX.Element => {
  const {
    app: {
      selectedToken,
      isDepositMode,
      arbTokenBridge: { eth, token, bridgeTokens }
    }
  } = useAppState()
  const [tokeModalOpen, setTokenModalOpen] = useState(false)

  const [depositing, setDepositing] = useState(false)

  const [l1Amount, setl1Amount] = useState<string>('')
  const [l2Amount, setl2Amount] = useState<string>('')

  const deposit = async () => {
    setDepositing(false)
    try {
      const amount = isDepositMode ? l1Amount : l2Amount
      if (isDepositMode) {
        if (selectedToken) {
          console.log('bridgeTokens[selectedToken.address]', bridgeTokens)
          // TODO allowed returns false even after approval
          if (!bridgeTokens[selectedToken.address]?.allowed) {
            await token.approve(selectedToken.address)
          }
          await token.deposit(selectedToken.address, amount)
        } else {
          await eth.deposit(amount)
        }
      } else if (selectedToken) {
        if (!bridgeTokens[selectedToken.address]?.allowed) {
          await token.approve(selectedToken.address)
        }
        await token.withdraw(selectedToken.address, amount)
      } else {
        await eth.withdraw(amount)
      }
    } catch (ex) {
      console.log(ex)
    } finally {
      setDepositing(false)
    }
  }

  return (
    <>
      <TokenModal isOpen={tokeModalOpen} setIsOpen={setTokenModalOpen} />

      <div className="flex justify-between max-w-networkBox mx-auto mb-4">
        <button
          type="button"
          onClick={() => setTokenModalOpen(true)}
          className="bg-white border border-gray-300 shadow-sm rounded-md py-2 px-4"
        >
          Token: {selectedToken ? selectedToken.symbol : 'Eth'}
        </button>
        <StatusBadge>2 Processing</StatusBadge>
      </div>
      <div className="flex flex-col w-full max-w-networkBox mx-auto mb-8">
        <div className="flex flex-col">
          <NetworkBox
            isL1
            amount={l1Amount}
            setAmount={setl1Amount}
            className={isDepositMode ? 'order-1' : 'order-3'}
          />
          <div className="h-2 relative flex justify-center order-2">
            <div className="flex items-center justify-center">
              <NetworkSwitchButton />
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
          <Button onClick={deposit} disabled={depositing}>
            {/* {depositing ? ( */}
            {/*  <Loader */}
            {/*    type="Oval" */}
            {/*    color="rgb(45, 55, 75)" */}
            {/*    height={14} */}
            {/*    width={14} */}
            {/*  /> */}
            {/* ) : ( */}
            Deposit
            {/* )} */}
          </Button>
        ) : (
          <Button onClick={deposit} disabled={depositing} variant="navy">
            {/* {depositing ? ( */}
            {/*  <Loader */}
            {/*    type="Oval" */}
            {/*    color="rgb(45, 55, 75)" */}
            {/*    height={14} */}
            {/*    width={14} */}
            {/*  /> */}
            {/* ) : ( */}
            Withdraw
            {/* )} */}
          </Button>
        )}
      </div>
    </>
  )
}

export { TransferPanel }
