import useCappedNumberInput from 'hooks/useCappedNumberInput'

import React from 'react'
import { BridgeBalance } from 'token-bridge-sdk'
import { formatEther } from 'ethers/utils'
import { useIsDepositMode } from 'components/App/ModeContext'

import NumberInputForm from './numberInputForm'
type ActionsProps = {
  balances: BridgeBalance | undefined
  eth: any
}

const Actions = ({ balances, eth }: ActionsProps) => {
  const arbChainBalance = balances ? +formatEther(balances.arbChainBalance) : 0
  const isDepositMode = useIsDepositMode()

  return (
    <div>
      <label htmlFor="basic-url">ETH on L2: {arbChainBalance}</label>

      <NumberInputForm
        max={arbChainBalance}
        text={'Withdraw Eth'}
        onSubmit={eth.withdraw}
        disabled={arbChainBalance === 0 || isDepositMode}
      />
    </div>
  )
}

export default Actions
