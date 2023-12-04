// DO NOT REVIEW, THIS WILL CHANGE A LOT WITH THE UI PR
// IT IS ONLY FOR TESTING

import { useAccount } from 'wagmi'
import dayjs from 'dayjs'

import { useTransactionHistory } from '../../hooks/useTransactionHistory'
import { DepositStatus, MergedTransaction } from '../../state/app/state'
import { getNetworkName } from '../../util/networks'
import { sanitizeTokenSymbol } from '../../util/TokenUtils'
import { getWagmiChain } from '../../util/wagmi/getWagmiChain'

function isDeposit(tx: MergedTransaction) {
  return !tx.isWithdrawal
}

function getSourceChainId(tx: MergedTransaction) {
  return isDeposit(tx) ? tx.parentChainId : tx.childChainId
}

function getDestChainId(tx: MergedTransaction) {
  return isDeposit(tx) ? tx.childChainId : tx.parentChainId
}

function getTxStatus(tx: MergedTransaction) {
  if (isDeposit(tx)) {
    switch (tx.depositStatus) {
      case DepositStatus.CREATION_FAILED:
      case DepositStatus.L1_FAILURE:
      case DepositStatus.L2_FAILURE:
        return 'Failure'
      case DepositStatus.EXPIRED:
        return 'Expired'
      case DepositStatus.L1_PENDING:
      case DepositStatus.L2_PENDING:
        return 'Pending'
      default:
        return 'Success'
    }
  } else {
    switch (tx.status) {
      case 'Executed':
        return 'Success'
      case 'Confirmed':
        return 'Claimable'
      case 'Unconfirmed':
        return 'Pending'
      default:
        return 'Failure'
    }
  }
}

function getRelativeTime(tx: MergedTransaction) {
  return dayjs(Number(tx.createdAt)).fromNow()
}

export const NewTransactionHistory = () => {
  const { address } = useAccount()

  const {
    data: { transactions, total },
    loading,
    paused
  } = useTransactionHistory(address)

  if (loading || transactions.length === 0) {
    return <div className="text-white">Fetching transactions...</div>
  }

  return (
    <div className="text-white">
      {typeof total === 'number' && transactions.length > 0 && (
        <p>
          Showing {transactions.length} out of {total} transactions
        </p>
      )}
      <table className="w-full">
        <thead>
          <th>TIME</th>
          <th>TOKEN</th>
          <th>FROM</th>
          <th>TO</th>
          <th>STATUS</th>
          <th />
        </thead>
        <tbody>
          {transactions.map(tx => (
            <tr key={`${tx.parentChainId}-${tx.childChainId}-${tx.txId}`}>
              <td>{getRelativeTime(tx)}</td>
              <td>
                {tx.value}{' '}
                {sanitizeTokenSymbol(tx.asset, {
                  erc20L1Address: tx.tokenAddress,
                  chain: getWagmiChain(tx.parentChainId)
                })}
              </td>
              <td>{getNetworkName(getSourceChainId(tx))}</td>
              <td>{getNetworkName(getDestChainId(tx))}</td>
              <td>{getTxStatus(tx)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
