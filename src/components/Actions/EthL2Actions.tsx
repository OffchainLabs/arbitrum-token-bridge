import React from 'react'
import { BridgeBalance } from 'token-bridge-sdk'
import { utils } from 'ethers'
import { useIsDepositMode } from 'components/App/ModeContext'
import WithdrawInfo from './WithdrawInfo'
import WithdrawWithOptions from './WithdrawWithOptions'
import { connextTxn } from 'util/index'
import NumberInputForm from './numberInputForm'
const { formatEther } = utils

type ActionsProps = {
  balances: BridgeBalance | undefined
  eth: any
  ethAddress: string
  handleConnextTxn: connextTxn
}

const Actions = ({
  balances,
  eth,
  ethAddress,
  handleConnextTxn
}: ActionsProps) => {
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
        buttonText={'withdraw'}
        dialogText="You are about to initiate an Ether withdrawal! Once initialize, you will have to wait ~1 week before you can claim your funds on L1. Are you sure you want to proceed?"
      />
      <WithdrawInfo />

    </div>
  )
}

export default Actions
