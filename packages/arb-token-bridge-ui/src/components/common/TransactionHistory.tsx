import { Tab } from '@headlessui/react'
import { Fragment, useEffect, useMemo, useState } from 'react'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { useAppState } from '../../state'
import { MergedTransaction } from '../../state/app/state'

import { PendingWithdrawalsLoadedState } from '../../util'
import { getNetworkLogo, getNetworkName } from '../../util/networks'
import {
  TransactionsTable,
  TransactionsDataStatus
} from '../TransactionsTable/TransactionsTable'
import { useDeposits, useWithdrawals } from '../TransactionsTable/useDeposits'

function getTransactionsDataStatus(
  pwLoadedState: PendingWithdrawalsLoadedState
): TransactionsDataStatus {
  switch (pwLoadedState) {
    case PendingWithdrawalsLoadedState.LOADING:
      return 'loading'

    case PendingWithdrawalsLoadedState.ERROR:
      return 'error'

    case PendingWithdrawalsLoadedState.READY:
      return 'success'
  }
}

export type PageParams = {
  searchString?: string
  pageNumber?: number
  pageSize?: number
  type: 'ETH' | 'ERC20'
  isDeposit: boolean
}

function isDeposit(tx: MergedTransaction) {
  return tx.direction === 'deposit' || tx.direction === 'deposit-l1'
}

export const TransactionHistory = () => {
  const {
    app: { mergedTransactions, arbTokenBridge }
  } = useAppState()

  const { l1, l2 } = useNetworksAndSigners()
  /* 
    Deposit history
  */
  const [pageParams, setPageParams] = useState<PageParams>({
    searchString: '',
    pageNumber: 0,
    pageSize: 10,
    type: 'ETH',
    isDeposit: false
  })

  const {
    data: depositsFromSubgraph,
    isValidating: depositsLoading,
    error: depositsError
  } = useDeposits({ ...pageParams })

  const {
    data: withdrawalsFromSubgraph,
    isValidating: withdrawalsLoading,
    error: withdrawalsError
  } = useWithdrawals({ ...pageParams })

  useEffect(() => {
    '***** called depositsFromSubgraph useEffect ****'
    arbTokenBridge?.transactions?.setDepositsInStore?.(
      depositsFromSubgraph || []
    )
  }, [depositsFromSubgraph])

  useEffect(() => {
    '***** called withdrawalsFromSubgraph useEffect ****'
    arbTokenBridge?.setWithdrawalsInStore?.(withdrawalsFromSubgraph || [])
  }, [withdrawalsFromSubgraph])

  const [deposits, withdrawals] = useMemo(() => {
    const _deposits: MergedTransaction[] = []
    const _withdrawals: MergedTransaction[] = []

    mergedTransactions.forEach(tx => {
      if (isDeposit(tx)) {
        _deposits.push(tx)
      } else {
        _withdrawals.push(tx)
      }
    })

    return [_deposits, _withdrawals]
  }, [mergedTransactions, depositsFromSubgraph])

  return (
    <Tab.Group>
      <Tab.List className={'flex flex-row'}>
        <Tab as={Fragment}>
          {({ selected }) => (
            <button
              className={`${
                !selected ? 'arb-hover text-white' : ''
              } flex flex-row flex-nowrap items-center gap-2 rounded-tl-lg rounded-tr-lg px-4 py-2 text-base ${
                selected && ` bg-white`
              }`}
            >
              {/* Deposits */}
              {selected && (
                <img
                  src={getNetworkLogo(l2.network.chainID)}
                  className="max-w-6 max-h-6"
                  alt="Deposit"
                />
              )}
              {`To ${getNetworkName(l2.network.chainID)}`}
            </button>
          )}
        </Tab>
        <Tab as={Fragment}>
          {({ selected }) => (
            <button
              className={`${
                !selected ? 'arb-hover text-white' : ''
              } flex flex-row flex-nowrap items-center gap-2 rounded-tl-lg rounded-tr-lg px-4 py-2 text-base ${
                selected && `bg-white`
              }`}
            >
              {/* Withdrawals */}
              {selected && (
                <img
                  src={getNetworkLogo(l1.network.chainID)}
                  className="max-w-6 max-h-6"
                  alt="Withdraw"
                />
              )}
              {`To ${getNetworkName(l1.network.chainID)}`}
            </button>
          )}
        </Tab>
      </Tab.List>
      <Tab.Panel className="overflow-scroll">
        <TransactionsTable
          status={
            depositsLoading ? 'loading' : !depositsError ? 'success' : 'error'
          }
          transactions={deposits}
          pageParams={pageParams}
          updatePageParams={setPageParams}
        />
      </Tab.Panel>
      <Tab.Panel className="overflow-scroll">
        <TransactionsTable
          status={
            withdrawalsLoading
              ? 'loading'
              : !withdrawalsError
              ? 'success'
              : 'error'
          }
          transactions={withdrawals}
          pageParams={pageParams}
          updatePageParams={setPageParams}
        />
      </Tab.Panel>
    </Tab.Group>
  )
}
