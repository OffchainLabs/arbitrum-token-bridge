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
import { useNetworksAndSigners } from '../../../hooks/useNetworksAndSigners'
import { MergedTransaction } from '../../../state/app/state'
import { useAccountType } from '../../../hooks/useAccountType'
import { getNetworkName } from '../../../util/networks'

export function TransactionsTableCctp() {
  const { address } = useAccount()
  const [type, setType] = useState<'deposits' | 'withdrawals'>('deposits')
  const { isSmartContractWallet } = useAccountType()
  const [pageParams, setPageParams] = useState<PageParams>({
    searchString: '',
    pageNumber: 0,
    pageSize: 10
  })
  const { l1, l2 } = useNetworksAndSigners()
  const { transfers, depositIds, withdrawalIds } = useCctpState()
  const {
    depositsError,
    withdrawalsError,
    isLoadingDeposits,
    isLoadingWithdrawals
  } = useCctpFetching({
    l1ChainId: l1.network.id,
    l2ChainId: l2.network.id,
    walletAddress: address,
    pageSize: pageParams.pageSize,
    pageNumber: pageParams.pageNumber,
    type
  })
  const isLoading =
    type === 'deposits' ? isLoadingDeposits : isLoadingWithdrawals
  const hasError = type === 'deposits' ? depositsError : withdrawalsError

  const status = useMemo(() => {
    if (isLoading) return TableStatus.LOADING
    if (hasError) return TableStatus.ERROR
    return TableStatus.SUCCESS
  }, [hasError, isLoading])

  const transactions = useMemo(() => {
    const startIndex = pageParams.pageNumber * pageParams.pageSize
    const ids = type === 'deposits' ? depositIds : withdrawalIds
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
    type,
    withdrawalIds
  ])

  useEffect(() => {
    setPageParams(prevPageParams => ({
      ...prevPageParams,
      pageNumber: 0
    }))
  }, [setPageParams, type])

  const tabs = useMemo(() => {
    return [
      {
        handleClick: () => setType('deposits'),
        isActive: type === 'deposits',
        text: `To ${getNetworkName(l2.network.id)}`
      },
      {
        handleClick: () => setType('withdrawals'),
        isActive: type === 'withdrawals',
        text: `To ${getNetworkName(l1.network.id)}`
      }
    ]
  }, [type, l1.network.id, l2.network.id])

  return (
    <>
      {!isSmartContractWallet && <TransactionsTableSwitch tabs={tabs} />}

      {/* search and pagination buttons */}
      <TableActionHeader
        type={'cctp'}
        pageParams={pageParams}
        setPageParams={setPageParams}
        transactions={transactions}
        isSmartContractWallet={isSmartContractWallet}
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
