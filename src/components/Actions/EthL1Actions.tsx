import React, { useMemo, useCallback } from 'react'
import { BridgeBalance } from 'token-bridge-sdk'
import NumberInputForm from './numberInputForm'
import { Transaction } from 'token-bridge-sdk'
import PendingWithdrawals from '../PendingWithdrawals'
import { L2ToL1EventResultPlus, AssetType } from 'token-bridge-sdk'
import { utils } from 'ethers'
import { PendingWithdrawalsMap } from 'token-bridge-sdk'
import { providers } from 'ethers'
import { useL1Network } from 'components/App/NetworkContext'

const { formatEther } = utils
type ActionsProps = {
  balances: BridgeBalance | undefined
  eth: any
  transactions: Transaction[]
  pendingWithdrawalsMap: PendingWithdrawalsMap
  ethProvider: providers.Provider
}

const Actions = ({
  balances,
  eth,
  transactions,
  pendingWithdrawalsMap,
  ethProvider
}: ActionsProps) => {
  const ethChainBalance = balances ? +formatEther(balances.balance) : 0
  const l1Network = useL1Network()

  const pendingEthBalance = useMemo(() => {
    return transactions.reduce((acc: number, txn: Transaction) => {
      const { type, assetName, status, value } = txn
      if (type === 'withdraw' && status === 'success' && assetName === 'ETH') {
        return acc + +(value || 0)
      } else {
        return acc
      }
    }, 0)
  }, [transactions])

  const onSubmit = useCallback(
    (value: string) => {
      eth.deposit(value)
    },
    [l1Network]
  )
  return (
    <div>
      <label htmlFor="basic-url">ETH on L1: {ethChainBalance}</label>

      <NumberInputForm
        max={ethChainBalance}
        text={'Deposit Eth'}
        onSubmit={onSubmit}
        disabled={ethChainBalance === 0}
        buttonText="deposit"
        dialogText="You are about to deposit Ether from L1 into Arbitrum! It will take ~10 minutes for you to see your balance credited on L2. Would you like to proceed?"

      />
      <label htmlFor="basic-url"></label>
      <PendingWithdrawals
        filter={(l2ToL1EventResultPlus: L2ToL1EventResultPlus) =>
          l2ToL1EventResultPlus.type === AssetType.ETH
        }
        headerText="Pending ETH Withdrawals"
        triggerOutbox={eth.triggerOutbox}
        pendingWithdrawalsMap={pendingWithdrawalsMap}
        ethProvider={ethProvider}
      />

      {/* {pendingEthBalance ? <label ><i>pending balance: {pendingEthBalance}</i></label> : null} */}
    </div>
  )
}

export default Actions
