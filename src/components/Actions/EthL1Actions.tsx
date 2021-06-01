import React, { useMemo } from 'react'
import { BridgeBalance } from 'token-bridge-sdk'
import { useIsDepositMode } from 'components/App/ModeContext'
import NumberInputForm from './numberInputForm'
import { Transaction } from 'token-bridge-sdk'
import PendingWithdrawals from '../PendingWithdrawals'
import { L2ToL1EventResultPlus, AssetType } from 'token-bridge-sdk'
import { utils } from 'ethers'
import { PendingWithdrawalsMap } from 'token-bridge-sdk'
import { providers } from 'ethers'

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
  const isDepositMode = useIsDepositMode()

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
  return (
    <div>
      <label htmlFor="basic-url">ETH on L1: {ethChainBalance}</label>

      <NumberInputForm
        max={ethChainBalance}
        text={'Deposit Eth'}
        onSubmit={eth.deposit}
        disabled={ethChainBalance === 0}
        buttonText="deposit"
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
