import { Tab } from '@headlessui/react'
import { Dispatch, Fragment, SetStateAction, useMemo } from 'react'
import { CompleteDepositData } from '../../hooks/useDeposits'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { CompleteWithdrawalData } from '../../hooks/useWithdrawals'
import { useAppState } from '../../state'
import { getNetworkLogo, getNetworkName } from '../../util/networks'
import {
  PageParams,
  TransactionsTable
} from './TransactionsTable/TransactionsTable'
import { PendingTransactions } from './PendingTransactions'
import { FailedTransactionsWarning } from './FailedTransactionsWarning'
import { isFailed, isPending } from '../../state/app/utils'

export const TransactionHistory = ({
  depositsPageParams,
  withdrawalsPageParams,
  depositsData,
  depositsLoading,
  depositsError,
  withdrawalsData,
  withdrawalsLoading,
  withdrawalsError,
  setDepositsPageParams,
  setWithdrawalsPageParams
}: {
  depositsPageParams: PageParams
  withdrawalsPageParams: PageParams
  depositsData: CompleteDepositData
  withdrawalsData: CompleteWithdrawalData
  depositsLoading: boolean
  depositsError: boolean
  withdrawalsLoading: boolean
  withdrawalsError: boolean
  setDepositsPageParams: Dispatch<SetStateAction<PageParams>>
  setWithdrawalsPageParams: Dispatch<SetStateAction<PageParams>>
}) => {
  const { l1, l2 } = useNetworksAndSigners()

  const {
    app: { mergedTransactions }
  } = useAppState()

  const pendingTransactions = useMemo(() => {
    return mergedTransactions?.filter(tx => isPending(tx))
  }, [mergedTransactions])

  const failedTransactions = useMemo(() => {
    return mergedTransactions?.filter(tx => isFailed(tx))
  }, [mergedTransactions])

  const localCachedTransactionMap = useMemo(() => {
    // map of all the locally-cached transactions
    // so that tx rows can easily subscribe to live-local status without refetching table data
    const localTxMap = new Map()
    mergedTransactions.forEach(tx => {
      localTxMap.set(tx.txId, tx)
    })
    return localTxMap
  }, [JSON.stringify(mergedTransactions || [])])

  return (
    <div className="flex flex-col justify-around gap-6">
      {/* Pending transactions cards */}
      <PendingTransactions
        loading={depositsLoading || withdrawalsLoading}
        transactions={pendingTransactions}
        error={depositsError || withdrawalsError}
      />

      {/* Warning to show when there are 3 or more failed transactions for the user */}
      <FailedTransactionsWarning transactions={failedTransactions} />

      {/* Transaction history table */}
      <div>
        <Tab.Group>
          <Tab.List className={'flex flex-row'}>
            <Tab as={Fragment}>
              {({ selected }) => (
                <button
                  className={`${
                    !selected ? 'arb-hover text-white' : 'selected bg-white'
                  } roundedTabRight relative flex flex-row flex-nowrap items-center gap-2 rounded-tl-lg rounded-tr-lg px-4 py-2 text-base`}
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
                    !selected ? 'arb-hover text-white' : 'selected bg-white'
                  } roundedTabRight roundedTabLeft relative flex flex-row flex-nowrap items-center gap-2 rounded-tl-lg rounded-tr-lg px-4 py-2 text-base`}
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
          <Tab.Panel className="overflow-auto">
            <TransactionsTable
              type="deposits"
              pageParams={depositsPageParams}
              setPageParams={setDepositsPageParams}
              transactions={depositsData.transformedDeposits}
              loading={depositsLoading}
              error={depositsError}
              localCachedTransactionMap={localCachedTransactionMap}
            />
          </Tab.Panel>
          <Tab.Panel className="overflow-auto">
            <TransactionsTable
              type="withdrawals"
              pageParams={withdrawalsPageParams}
              setPageParams={setWithdrawalsPageParams}
              transactions={withdrawalsData.transformedWithdrawals}
              loading={withdrawalsLoading}
              error={withdrawalsError}
              localCachedTransactionMap={localCachedTransactionMap}
            />
          </Tab.Panel>
        </Tab.Group>
      </div>
    </div>
  )
}
