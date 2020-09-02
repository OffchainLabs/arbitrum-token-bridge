import useCappedNumberInput from 'hooks/useCappedNumberInput'

import React from 'react'
import { BridgeBalance } from 'token-bridge-sdk'
import { formatEther } from 'ethers/utils'
import NumberInputForm from './numberInputForm'
import Button from 'react-bootstrap/Button'
// TODO: refactor with EthActions into one component?
import { useIsDepositMode } from 'components/App/ModeContext'

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
      />
    </div>
  )
}

export default Actions
