import { Tab } from '@headlessui/react'
import { InformationCircleIcon } from '@heroicons/react/outline'
import { Fragment, useMemo } from 'react'
import { useAppState } from '../../state'
import { MergedTransaction } from '../../state/app/state'

import { PendingWithdrawalsLoadedState } from '../../util'
import {
  TransactionsTable,
  TransactionsDataStatus
} from '../TransactionsTable/TransactionsTable'

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

function isDeposit(tx: MergedTransaction) {
  return tx.direction === 'deposit' || tx.direction === 'deposit-l1'
}

export const TransactionHistory = () => {
  const {
    app: { mergedTransactions, pwLoadedState }
  } = useAppState()

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
  }, [mergedTransactions])

  return (
    <>
      <div className="flex flex-col space-y-1 px-4 py-2 lg:px-0 lg:py-0 lg:pb-2">
        <span className="text-xl">Transaction History</span>

        <div className="h-1 w-full border-b-[1px] border-gray-9" />
        {/* <div className="flex flex-row items-center space-x-1">
          <InformationCircleIcon className="h-5 w-5 text-gray-10" />
          <span className="text-sm font-light text-gray-10">
            Withdrawals older than one year are currently not displayed.
          </span>
        </div> */}
      </div>
      <Tab.Group>
        <Tab.List>
          <Tab as={Fragment}>
            {({ selected }) => (
              <button
                className={`${
                  !selected ? 'arb-hover' : ''
                } rounded-tl-lg rounded-tr-lg px-4 py-2 ${
                  selected &&
                  `border-2 border-b-0 border-blue-arbitrum border-opacity-80 bg-gray-3`
                }`}
              >
                Deposits
              </button>
            )}
          </Tab>
          <Tab as={Fragment}>
            {({ selected }) => (
              <button
                className={`${
                  !selected ? 'arb-hover' : ''
                } rounded-tl-lg rounded-tr-lg px-4 py-2 ${
                  selected &&
                  `border-2 border-b-0 border-blue-arbitrum border-opacity-80 bg-gray-3`
                }`}
              >
                Withdrawals
              </button>
            )}
          </Tab>
        </Tab.List>
        <Tab.Panel>
          <TransactionsTable
            // Currently we load deposit history from local cache, so it's always a success
            status="success"
            transactions={deposits}
            className="-mt-0.5 border-2 border-blue-arbitrum border-opacity-80 bg-gray-3"
          />
        </Tab.Panel>
        <Tab.Panel>
          <TransactionsTable
            status={getTransactionsDataStatus(pwLoadedState)}
            transactions={withdrawals}
            className="-mt-0.5 border-2 border-blue-arbitrum border-opacity-80 bg-gray-3"
          />
        </Tab.Panel>
      </Tab.Group>
    </>
  )
}
