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
}

const Actions = ({
  balances,
  eth,
  bridgeTokens,
  currentERC20Address,
  ethAddress,
}: ActionsProps) => {
  const currentContract = bridgeTokens[currentERC20Address]
  const decimals = (currentContract && currentContract.decimals) || 18
  const symbol = (currentContract && currentContract.symbol) || "token"

  const arbChainBalance = balances && balances.arbChainBalance
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
        dialogText={`You are about to initiate a ${symbol} withdrawal! Once initialized, you will have to wait ~1 week before you can claim your funds on L1. Are you sure you want to proceed?`}
      /> 
      <WithdrawInfo />

    </div>
  )
}

export default Actions
