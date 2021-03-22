import useCappedNumberInput from 'hooks/useCappedNumberInput'

import React, { useMemo } from 'react'
import { BridgeBalance } from 'token-bridge-sdk'
import { utils } from 'ethers'
import NumberInputForm from './numberInputForm'
import Button from 'react-bootstrap/Button'
import { useIsDepositMode } from 'components/App/ModeContext'
import SubmitNoInput from './SubmitNoInput'
import { Transaction } from 'token-bridge-sdk'
import { PendingWithdrawalsMap } from 'token-bridge-sdk'
import  PendingWithdrawals  from '../PendingWithdrawals'
import { L2ToL1EventResultPlus, AssetType } from 'token-bridge-sdk'

const { formatUnits } = utils

type ActionsProps = {
  balances: BridgeBalance | undefined
  token: any
  bridgeTokens: any
  currentERC20Address: string
  transactions: Transaction[]
  pendingWithdrawalsMap: PendingWithdrawalsMap
}

const Actions = ({
  balances,
  token,
  bridgeTokens,
  currentERC20Address,
  transactions,
  pendingWithdrawalsMap

}: ActionsProps) => {
  const currentContract = bridgeTokens[currentERC20Address]
  const decimals = currentContract && currentContract.decimals || 18

  const ethChainBalance = balances ? +formatUnits(balances.balance, decimals) : 0
  const arbChainBalance = balances ? +formatUnits(balances.arbChainBalance, decimals) : 0
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
          onClick={() => token.approve(currentERC20Address)}
        >
          Approve
        </Button>
      )}
      <label htmlFor="basic-url">Token on L1: {ethChainBalance}</label>
      <NumberInputForm
        max={ethChainBalance}
        text={'Deposit Token'}
        onSubmit={value => {
          token.deposit(currentERC20Address, value)
        }}
        disabled={!isDepositMode || ethChainBalance === 0}
        buttonText="deposit"
      />
      <label htmlFor="basic-url"></label>


      <PendingWithdrawals
        filter={(l2ToL1EventResultPlus: L2ToL1EventResultPlus)=> l2ToL1EventResultPlus.type === AssetType.ERC20 }
        headerText="Pending Token Withdrawals"
        triggerOutbox={token.triggerOutbox}
        pendingWithdrawalsMap={{}}

        />

    
    </div>
  )
}

export default Actions
