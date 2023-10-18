import React, { useEffect, useMemo, useState } from 'react'
import { useAccount } from 'wagmi'

import { TransactionsTableClaimableRow } from './TransactionsTableClaimableRow'
import { TableBodyLoading } from './TableBodyLoading'
import { TableBodyError } from './TableBodyError'
import { TableActionHeader } from './TableActionHeader'
import {
  EmptyTableRow,
  PageParams,
  TableStatus,
  TransactionsTableHeader
} from './TransactionsTable'
import { TransactionsTableSwitch } from './TransactionsTableSwitch'
import { useCctpFetching, useCctpState } from '../../../state/cctpState'
import { MergedTransaction } from '../../../state/app/state'
import { useAccountType } from '../../../hooks/useAccountType'
import { getNetworkName } from '../../../util/networks'
import { useAppContextActions, useAppContextState } from '../../App/AppContext'
import { useNetworks } from '../../../hooks/useNetworks'

export function TransactionsTableCctp() {
  const { address } = useAccount()
  const {
    layout: { isTransactionHistoryShowingCctpDeposits }
  } = useAppContextState()
  const { showCctpDepositsTransactions, showCctpWithdrawalsTransactions } =
    useAppContextActions()

  const { isSmartContractWallet } = useAccountType()
  const [pageParams, setPageParams] = useState<PageParams>({
    searchString: '',
    pageNumber: 0,
    pageSize: 10
  })
  const [{ fromProvider, toProvider }] = useNetworks()
  const { transfers, depositIds, withdrawalIds } = useCctpState()
  const {
    depositsError,
    withdrawalsError,
    isLoadingDeposits,
    isLoadingWithdrawals
  } = useCctpFetching({
    l1ChainId: fromProvider.network.chainId,
    l2ChainId: toProvider.network.chainId,
    walletAddress: address,
    pageSize: pageParams.pageSize,
    pageNumber: pageParams.pageNumber,
    type: isTransactionHistoryShowingCctpDeposits ? 'deposits' : 'withdrawals'
  })
  const isLoading = isTransactionHistoryShowingCctpDeposits
    ? isLoadingDeposits
    : isLoadingWithdrawals
  const hasError = isTransactionHistoryShowingCctpDeposits
    ? depositsError
    : withdrawalsError

  const status = useMemo(() => {
    if (isLoading) return TableStatus.LOADING
    if (hasError) return TableStatus.ERROR
    return TableStatus.SUCCESS
  }, [hasError, isLoading])

  const transactions = useMemo(() => {
    const startIndex = pageParams.pageNumber * pageParams.pageSize
    const ids = isTransactionHistoryShowingCctpDeposits
      ? depositIds
      : withdrawalIds
    return ids
      .map(id => transfers[id])
      .slice(
        startIndex,
        startIndex + pageParams.pageSize
      ) as unknown as MergedTransaction[]
  }, [
    depositIds,
    pageParams.pageNumber,
    pageParams.pageSize,
    transfers,
    isTransactionHistoryShowingCctpDeposits,
    withdrawalIds
  ])

  useEffect(() => {
    setPageParams(prevPageParams => ({
      ...prevPageParams,
      pageNumber: 0
    }))
  }, [setPageParams, isTransactionHistoryShowingCctpDeposits])

  const tabs = useMemo(() => {
    return [
      {
        handleClick: () => showCctpDepositsTransactions(),
        isActive: isTransactionHistoryShowingCctpDeposits,
        text: `To ${getNetworkName(toProvider.network.chainId)}`
      },
      {
        handleClick: () => showCctpWithdrawalsTransactions(),
        isActive: !isTransactionHistoryShowingCctpDeposits,
        text: `To ${getNetworkName(fromProvider.network.chainId)}`
      }
    ]
  }, [
    isTransactionHistoryShowingCctpDeposits,
    fromProvider.network.chainId,
    toProvider.network.chainId,
    showCctpDepositsTransactions,
    showCctpWithdrawalsTransactions
  ])

  return (
    <>
      {!isSmartContractWallet && <TransactionsTableSwitch tabs={tabs} />}

      {/* search and pagination buttons */}
      <TableActionHeader
        type={'cctp'}
        pageParams={pageParams}
        setPageParams={setPageParams}
        transactions={transactions}
        loading={isLoading}
        showSearch={false}
      />

      <table className="w-full overflow-hidden rounded-b-lg bg-white">
        <TransactionsTableHeader />

        <tbody>
          {status === TableStatus.LOADING && <TableBodyLoading />}

          {status === TableStatus.ERROR && <TableBodyError />}

          {/* when there are no transactions present */}
          {status === TableStatus.SUCCESS && !transactions.length && (
            <EmptyTableRow>
              <span className="text-sm font-medium">No transactions</span>
            </EmptyTableRow>
          )}

          {/* finally, when transactions are present, show rows */}
          {status === TableStatus.SUCCESS &&
            transactions.map((tx, index) => {
              const isLastRow = index === transactions.length - 1

              return (
                <TransactionsTableClaimableRow
                  key={`${tx.txId}-${tx.direction}`}
                  tx={tx}
                  className={!isLastRow ? 'border-b border-black' : ''}
                />
              )
            })}
        </tbody>
      </table>
    </>
  )
}
