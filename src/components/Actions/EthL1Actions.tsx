import useCappedNumberInput from 'hooks/useCappedNumberInput'

import React, { useMemo } from 'react'
import { BridgeBalance } from 'token-bridge-sdk'
import { formatEther } from 'ethers/utils'
import { useIsDepositMode } from 'components/App/ModeContext'
import NumberInputForm from './numberInputForm'
import Button from 'react-bootstrap/Button'
import SubmitNoInput from './SubmitNoInput'
import { Transaction } from 'token-bridge-sdk'

type ActionsProps = {
  balances: BridgeBalance | undefined
  eth: any
  transactions: Transaction[]
}

const Actions = ({ balances, eth, transactions }: ActionsProps) => {
  const ethChainBalance = balances ? +formatEther(balances.balance) : 0
  const lockBoxBalance = balances ? +formatEther(balances.lockBoxBalance) : 0
  const isDepositMode = useIsDepositMode()

  const pendingEthBalance = useMemo(()=>{
    return transactions.reduce((acc: number, txn: Transaction)=>{
      const { type, assetName, status, value } = txn
      if (type === 'withdraw' && status === 'success' && assetName === 'ETH'){
        return acc + +(value || 0)
      } else {
        return acc
      }

    }, 0)
  }, [transactions])
  return (
    <div>
      <label htmlFor="basic-url">ETH on L1: {ethChainBalance}</label>

      <NumberInputForm
        max={ethChainBalance}
        text={'Deposit Eth'}
        onSubmit={eth.deposit}
        disabled={ethChainBalance === 0 || !isDepositMode}
        buttonText="deposit"
      />
      <label htmlFor="basic-url">
      </label>

      <SubmitNoInput
        max={lockBoxBalance}
        text={`ETH in LockBox: ${balances && formatEther(balances.lockBoxBalance)}`}
        onSubmit={eth.withdrawLockBox}
        disabled={lockBoxBalance === 0 || !isDepositMode}
        buttonText={`transfer lockbox`}
        readOnlyValue={lockBoxBalance}
      />

  {pendingEthBalance ? <label ><i>pending balance: {pendingEthBalance}</i></label> : null}

    </div>
  )
}

export default Actions
