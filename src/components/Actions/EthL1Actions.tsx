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
  const ethChainBalance = balances ? +formatEther(balances.balance) : 0
  const lockBoxBalance = balances ? +formatEther(balances.lockBoxBalance) : 0
  const isDepositMode = useIsDepositMode()
  return (
    <div>
      <label htmlFor="basic-url">ETH on L1: {ethChainBalance}</label>

      <NumberInputForm
        max={ethChainBalance}
        text={'Deposit Eth'}
        onSubmit={eth.deposit}
        disabled={ethChainBalance === 0 || !isDepositMode}
      />
      <label htmlFor="basic-url">
        ETH in L1 LockBox: {balances && formatEther(balances.lockBoxBalance)}
      </label>

      <NumberInputForm
        max={lockBoxBalance}
        text={'LockBox'}
        onSubmit={eth.withdrawLockBox}
        disabled={lockBoxBalance === 0 || !isDepositMode}
      />
    </div>
  )
}

export default Actions
