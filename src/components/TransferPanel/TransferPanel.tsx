import React, { useState } from 'react'

import Loader from 'react-loader-spinner'

import { useAppState } from '../../state'
import { Button } from '../common/Button'
import { NetworkSwitchButton } from '../common/NetworkSwitchButton'
import { StatusBadge } from '../common/StatusBadge'
import { L1NetworkBox } from './L1NetworkBox'
import { L2NetworkBox } from './L2NetworkBox'

const TransferPanel = (): JSX.Element => {
  const {
    app: {
      arbTokenBridge: { balances, walletAddress, eth }
    }
  } = useAppState()

  const [depositing, setDepositing] = useState(false)
  // const inputValueL1 = useCappedNumberInput(
  //   balances?.eth?.balance.toNumber() || 0
  // )
  const [l1Amount, setl1Amount] = useState<string>('')
  const [l2Amount, setl2Amount] = useState<string>('')

  const deposit = async () => {
    setDepositing(true)
    try {
      await eth.deposit(`${l1Amount}`)
    } catch (ex) {
      console.log(ex)
    } finally {
      setDepositing(false)
    }
  }

  return (
    <>
      <div className="flex justify-between max-w-networkBox mx-auto mb-4">
        <button
          type="button"
          className="bg-white border border-gray-300 rounded-md py-2 px-4"
        >
          Token: ETH
        </button>
        <StatusBadge>2 Processing</StatusBadge>
      </div>
      <div className="flex flex-col w-full max-w-networkBox mx-auto mb-8">
        <div className="flex flex-col">
          <L1NetworkBox
            balance={balances.eth}
            address={walletAddress}
            amount={l1Amount}
            setAmount={setl1Amount}
            className="order-1"
          />
          <div className="h-2 relative flex justify-center order-2">
            <div className="flex items-center justify-center">
              <NetworkSwitchButton />
            </div>
          </div>
          <L2NetworkBox
            balance={balances.eth}
            address={walletAddress}
            amount={l2Amount}
            setAmount={setl2Amount}
            className="order-3"
          />
        </div>

        <div className="h-6" />
        <Button onClick={deposit} disabled={depositing}>
          {depositing ? (
            <Loader
              type="Oval"
              color="rgb(45, 55, 75)"
              height={14}
              width={14}
            />
          ) : (
            'Deposit'
          )}
        </Button>
      </div>
    </>
  )
}

export { TransferPanel }
