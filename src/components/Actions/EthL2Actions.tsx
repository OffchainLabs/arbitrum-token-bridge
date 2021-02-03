import useCappedNumberInput from 'hooks/useCappedNumberInput'

import React from 'react'
import { BridgeBalance } from 'token-bridge-sdk'
import { formatEther } from 'ethers/utils'
import { useIsDepositMode } from 'components/App/ModeContext'
import WithdrawInfo from './WithdrawInfo'
import NumberInputForm from './numberInputForm'
import WithdrawWithOptions from './WithdrawWithOptions'
type ActionsProps = {
  balances: BridgeBalance | undefined
  eth: any
  ethAddress: string
}

const Actions = ({ balances, eth, ethAddress }: ActionsProps) => {
  const arbChainBalance = balances ? +formatEther(balances.arbChainBalance) : 0
  const isDepositMode = useIsDepositMode()

  return (
    <div>
      <label htmlFor="basic-url">ETH on L2: {arbChainBalance}</label>

      <WithdrawWithOptions
        max={arbChainBalance}
        text={'Withdraw Eth'}
        onSubmit={eth.withdraw}
        disabled={arbChainBalance === 0 || isDepositMode}
        buttonText={'withdraw'}
        ethAddress={ethAddress}
      />

    </div>
  )
}

export default Actions
