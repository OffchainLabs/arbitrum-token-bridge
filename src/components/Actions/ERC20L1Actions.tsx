import useCappedNumberInput from 'hooks/useCappedNumberInput'

import React, { useMemo } from 'react'
import { BridgeBalance } from 'token-bridge-sdk'
import { formatEther } from 'ethers/utils'
import NumberInputForm from './numberInputForm'
import Button from 'react-bootstrap/Button'
import { useIsDepositMode } from 'components/App/ModeContext'
import SubmitNoInput from './SubmitNoInput'
import { Transaction } from 'token-bridge-sdk'

type ActionsProps = {
  balances: BridgeBalance | undefined
  eth: any
  bridgeTokens: any
  currentERC20Address: string
  transactions: Transaction[]
}

const Actions = ({
  balances,
  eth,
  bridgeTokens,
  currentERC20Address,
  transactions

}: ActionsProps) => {
  const ethChainBalance = balances ? +formatEther(balances.balance) : 0
  const arbChainBalance = balances ? +formatEther(balances.arbChainBalance) : 0
  const lockBoxBalance = balances ? +formatEther(balances.lockBoxBalance) : 0
  const currentContract = bridgeTokens[currentERC20Address]
  const isDepositMode = useIsDepositMode()

  const pendingTokenBalance = useMemo(()=>{
    if (!currentContract){
      return 0
    }
    return transactions.reduce((acc: number, txn: Transaction)=>{
      const { type, assetName, status, value } = txn
      if (type === 'withdraw' && status === 'success' && assetName === currentContract.symbol){
        return acc + +(value || 0)
      } else {
        return acc
      }

    }, 0)
  }, [transactions, currentContract])
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

    {pendingTokenBalance ? <label > <i>pending balance: {pendingTokenBalance}</i></label> : null}
    </div>
  )
}

export default Actions
