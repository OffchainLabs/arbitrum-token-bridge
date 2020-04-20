import useCappedNumberInput from 'hooks/useCappedNumberInput'

import React from 'react'
import { BridgeBalance } from 'arb-token-bridge'
import { formatEther } from 'ethers/utils'

import NumberInputForm from './numberInputForm'
type ActionsProps = {
  balances: BridgeBalance | undefined
  eth: any
}

const Actions = ({ balances, eth }: ActionsProps) => {
  const ethChainBalance = balances ? +formatEther(balances.balance) : 0
  const arbChainBalance = balances ? +formatEther(balances.arbChainBalance) : 0
  const lockBoxBalance = balances ? +formatEther(balances.lockBoxBalance) : 0

  return (
    <div>
      <NumberInputForm
        max={ethChainBalance}
        text={'Deposit Eth'}
        onSubmit={eth.deposit}
      />
      <NumberInputForm
        max={arbChainBalance}
        text={'Withdraw Eth'}
        onSubmit={eth.withdraw}
      />
      <NumberInputForm
        max={lockBoxBalance}
        text={'Withdraw LockBox'}
        onSubmit={eth.withdrawLockBox}
      />
    </div>
  )
}

export default Actions
