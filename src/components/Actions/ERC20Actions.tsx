import useCappedNumberInput from 'hooks/useCappedNumberInput'

import React from 'react'
import { BridgeBalance } from 'arb-token-bridge'
import { formatEther } from 'ethers/utils'
import NumberInputForm from './numberInputForm'
import Button from 'react-bootstrap/Button'
// TODO: refactor with EthActions into one component?
type ActionsProps = {
  balances: BridgeBalance | undefined
  eth: any
  bridgeTokens: any
  currentERC20Address: string
}

const Actions = ({
  balances,
  eth,
  bridgeTokens,
  currentERC20Address
}: ActionsProps) => {
  const ethChainBalance = balances ? +formatEther(balances.balance) : 0
  const arbChainBalance = balances ? +formatEther(balances.arbChainBalance) : 0
  const lockBoxBalance = balances ? +formatEther(balances.lockBoxBalance) : 0
  const currentContract = bridgeTokens[currentERC20Address]

  return (
    <div>
      {currentContract && !currentContract.allowed && <Button
        variant="outline-secondary"
        disabled={false}
        onClick={() => eth.approve(currentERC20Address)}
      >
        Approve
      </Button>
        }
      <NumberInputForm
        max={ethChainBalance}
        text={'Deposit Token'}
        onSubmit={value => {
          eth.deposit(currentERC20Address, value)
        }}
      />
      <NumberInputForm
        max={arbChainBalance}
        text={'Withdraw Token'}
        onSubmit={value => {
          eth.withdraw(currentERC20Address, value)
        }}
      />
      <NumberInputForm
        max={lockBoxBalance}
        text={'Withdraw LockBox'}
        onSubmit={value => {
          eth.withdrawLockBox(currentERC20Address, value)
        }}
      />
    </div>
  )
}

export default Actions
