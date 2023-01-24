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
import { useDeposits } from '../TransactionsTable/useDeposits'

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
}

function isDeposit(tx: MergedTransaction) {
  return tx.direction === 'deposit' || tx.direction === 'deposit-l1'
}

export const TransactionHistory = () => {
  const {
    app: {
      mergedTransactions,
      pwLoadedState,
      arbTokenBridge: {
        transactions: { setTransactions: setTransactionsInStore }
      }
    }
  } = useAppState()

  const { l1, l2 } = useNetworksAndSigners()
  /* 
    Deposit history
  */
  const [pageParams, setPageParams] = useState<PageParams>({
    searchString: '',
    pageNumber: 0,
    pageSize: 10,
    type: 'ETH'
  })

  const { data: depositsFromSubgraph, isValidating: depositsLoading } =
    useDeposits({ ...pageParams })

  useEffect(() => {
    '***** called depositsFromSubgraph useEffect ****'
    setTransactionsInStore(depositsFromSubgraph || [])
  }, [depositsFromSubgraph])

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
    <>
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
                  />
                )}
                {`To ${getNetworkName(l1.network.chainID)}`}
              </button>
            )}
          </Tab>
        </Tab.List>
        <Tab.Panel>
          <TransactionsTable
            // Currently we load deposit history from local cache, so it's always a success
            status={depositsLoading ? 'loading' : 'success'}
            transactions={deposits}
            pageParams={pageParams}
            updatePageParams={setPageParams}
          />
        </Tab.Panel>
        <Tab.Panel>
          <TransactionsTable
            status={getTransactionsDataStatus(pwLoadedState)}
            transactions={withdrawals}
            pageParams={pageParams}
            updatePageParams={setPageParams}
          />
        </Tab.Panel>
      </Tab.Group>
    </>
  )
}
