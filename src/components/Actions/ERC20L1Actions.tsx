import useCappedNumberInput from 'hooks/useCappedNumberInput'

import React from 'react'
import { BridgeBalance } from 'token-bridge-sdk'
import { formatEther } from 'ethers/utils'
import NumberInputForm from './numberInputForm'
import Button from 'react-bootstrap/Button'
import { useIsDepositMode } from 'components/App/ModeContext'
import SubmitNoInput from './SubmitNoInput'

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
  const isDepositMode = useIsDepositMode()
  return (
    <div>
      {currentContract && !currentContract.allowed && (
        <Button
          variant="outline-secondary"
          disabled={false}
          onClick={() => eth.approve(currentERC20Address)}
        >
          Approve
        </Button>
      )}
      <label htmlFor="basic-url">Token on L1: {ethChainBalance}</label>
      <NumberInputForm
        max={ethChainBalance}
        text={'Deposit Token'}
        onSubmit={value => {
          eth.deposit(currentERC20Address, value)
        }}
        disabled={!isDepositMode || ethChainBalance === 0}
        buttonText="deposit"
      />
      <label htmlFor="basic-url"></label>

      <SubmitNoInput
        max={lockBoxBalance}
        text={`Tokens in Lockbox: ${lockBoxBalance}`}
        onSubmit={value => {
          eth.withdrawLockBox(currentERC20Address, value)
        }}
        disabled={!isDepositMode || lockBoxBalance === 0}
        buttonText="transfer lockbox"
        readOnlyValue={lockBoxBalance}
      />
    </div>
  )
}

export default Actions
