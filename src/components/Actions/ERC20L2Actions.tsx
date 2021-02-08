import useCappedNumberInput from 'hooks/useCappedNumberInput'

import React from 'react'
import { BridgeBalance } from 'token-bridge-sdk'
import { formatEther } from 'ethers/utils'
import NumberInputForm from './numberInputForm'
import Button from 'react-bootstrap/Button'
// TODO: refactor with EthActions into one component?
import { useIsDepositMode } from 'components/App/ModeContext'
import WithdrawInfo from './WithdrawInfo'
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
  const arbChainBalance = balances ? +formatEther(balances.arbChainBalance) : 0
  const currentContract = bridgeTokens[currentERC20Address]
  const isDepositMode = useIsDepositMode()
  const l2Only = currentContract && !currentContract.eth
  const symbol = currentContract && currentContract.symbol

  return (
    <div>
      <label htmlFor="basic-url">Token on L2: {arbChainBalance}</label>
      <NumberInputForm
        max={arbChainBalance}
        text={l2Only ? "-----" :`Withdraw Token`}
        onSubmit={value => {
          eth.withdraw(currentERC20Address, value)
        }}
        disabled={isDepositMode || arbChainBalance === 0 || l2Only}
        buttonText="withdraw"
        buttonHoverText={l2Only ? `${symbol || 'Token'} is an Arbitrum-only token with no L1 contract, and thus cannot be withdrawn` : ""}
      />
      <WithdrawInfo />
    </div>
  )
}

export default Actions
