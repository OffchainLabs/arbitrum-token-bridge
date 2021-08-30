import React from 'react'
import { BridgeBalance } from 'token-bridge-sdk'
import { utils } from 'ethers'
import WithdrawWithOptions from './WithdrawWithOptions'

import { useIsDepositMode } from 'components/App/ModeContext'
import WithdrawInfo from './WithdrawInfo'
import { connextTxn } from 'util/index'
import NumberInputForm from './numberInputForm'
const { formatUnits } = utils
type ActionsProps = {
  balances: BridgeBalance | undefined
  eth: any
  bridgeTokens: any
  currentERC20Address: string
  ethAddress: string
  handleConnextTxn: connextTxn
}

const Actions = ({
  balances,
  eth,
  bridgeTokens,
  currentERC20Address,
  ethAddress,
  handleConnextTxn
}: ActionsProps) => {
  const currentContract = bridgeTokens[currentERC20Address]
  const decimals = (currentContract && currentContract.decimals) || 18
  const arbChainBalance = balances
    ? +formatUnits(balances.arbChainBalance, decimals)
    : 0
  const isDepositMode = useIsDepositMode()

  return (
    
    <div>
      <label htmlFor="basic-url">Token on L2: {arbChainBalance}</label>
      <NumberInputForm
        max={arbChainBalance}
        text={'Withdraw Token'}
        onSubmit={value => {
          eth.withdraw(currentERC20Address, value)
        }}
        disabled={isDepositMode || arbChainBalance === 0}
        buttonText="withdraw"
      /> 
      <WithdrawInfo />

    </div>
  )
}

export default Actions
