import { Tab } from '@headlessui/react'
import { Dispatch, SetStateAction, useEffect, useMemo } from 'react'
import { useNetwork } from 'wagmi'

import { CompleteDepositData } from '../../hooks/useDeposits'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { CompleteWithdrawalData } from '../../hooks/useWithdrawals'
import { useAppState } from '../../state'
import { getNetworkLogo, getNetworkName, isNetwork } from '../../util/networks'
import {
  PageParams,
  TransactionsTable
} from './TransactionsTable/TransactionsTable'
import { PendingTransactions } from './PendingTransactions'
import { FailedTransactionsWarning } from './FailedTransactionsWarning'
import { isFailed, isPending } from '../../state/app/utils'
import Image from 'next/image'
import { TabButton } from '../common/Tab'
import { useAccountType } from '../../hooks/useAccountType'
import { useAppContextActions } from '../App/AppContext'
import { useCctpState } from '../../state/cctpState'
import { MergedTransaction } from '../../state/app/state'
import dayjs from 'dayjs'
import { TransactionsTableCctp } from './TransactionsTable/TransactionsTableCctp'

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
  const { chain } = useNetwork()
  const { l1, l2 } = useNetworksAndSigners()
  const { isSmartContractWallet, isEOA } = useAccountType()
  const { showSentTransactions, showReceivedTransactions } =
    useAppContextActions()
  const { pendingIds: pendingIdsCctp, transfers: transfersCctp } =
    useCctpState()

  const {
    app: { mergedTransactions }
  } = useAppState()

  const isLoading = depositsLoading || withdrawalsLoading
  const error = depositsError || withdrawalsError

  const pendingTransactions = useMemo(() => {
    const pendingCctpTransactions = pendingIdsCctp
      .map(pendingId => {
        return transfersCctp[pendingId]
      })
      .filter(Boolean) as unknown as MergedTransaction[]
    const transactions = mergedTransactions
      .concat(pendingCctpTransactions)
      .sort((t1, t2) => {
        if (t1.createdAt && t2.createdAt) {
          return dayjs(t2.createdAt).isAfter(t1.createdAt) ? 1 : -1
        }

        if (t2.blockNum && t1.blockNum) {
          return t2.blockNum - t1.blockNum
        }

        return 0
      })
    return transactions.filter(tx => isPending(tx))
  }, [mergedTransactions, pendingIdsCctp, transfersCctp])

  const failedTransactions = useMemo(() => {
    return mergedTransactions.filter(tx => isFailed(tx))
  }, [mergedTransactions])

  const roundedTabClasses =
    'roundedTab ui-not-selected:arb-hover roundedTabRight relative flex flex-row flex-nowrap items-center gap-2 rounded-tl-lg rounded-tr-lg px-4 py-2 text-base ui-selected:bg-white ui-not-selected:text-white'

  function handleSentOrReceivedTxForSCW(index: number) {
    if (!isSmartContractWallet || !chain) {
      return
    }
    const isDepositsTab = index === 0
    const isConnectedToArbitrum = isNetwork(chain.id).isArbitrum
    // SCW address is tied to a specific network, so we must ensure that:
    if (isDepositsTab) {
      // if showing deposits, we always show:
      if (isConnectedToArbitrum) {
        // - received txs if connected to L2
        showReceivedTransactions()
      } else {
        // - sent txs if connected to L1
        showSentTransactions()
      }
    } else {
      // if showing withdrawals, we always show:
      if (isConnectedToArbitrum) {
        // - sent txs if connected to L2
        showSentTransactions()
      } else {
        // - received txs if connected to L1
        showReceivedTransactions()
      }
    }
  }

  useEffect(() => {
    // this function runs every time the network tab is changed, and here it is also triggered when the page loads
    // it sets the tab to 0 (deposits), which is the default tab
    handleSentOrReceivedTxForSCW(0)
  }, [isSmartContractWallet, chain])

  return (
    <div className="flex flex-col justify-around gap-6">
      {/* Pending transactions cards */}
      <PendingTransactions
        loading={isLoading}
        transactions={pendingTransactions}
        error={error}
      />

      {/* Warning to show when there are 3 or more failed transactions for the user */}
      <FailedTransactionsWarning transactions={failedTransactions} />

      {/* Transaction history table */}
      <div>
        <Tab.Group onChange={handleSentOrReceivedTxForSCW}>
          <Tab.List className={'flex flex-row whitespace-nowrap'}>
            <TabButton
              aria-label="show deposit transactions"
              className={`${roundedTabClasses}`}
            >
              {/* Deposits */}
              <Image
                src={getNetworkLogo(l2.network.id)}
                className="h-6 w-auto"
                alt="Deposit"
                height={24}
                width={24}
              />
              {`To ${getNetworkName(l2.network.id)}`}
            </TabButton>
            <TabButton
              aria-label="show withdrawal transactions"
              className={`${roundedTabClasses} roundedTabLeft`}
            >
              {/* Withdrawals */}
              <Image
                src={getNetworkLogo(l1.network.id)}
                className="h-6 w-auto"
                alt="Withdraw"
                width={24}
                height={24}
              />
              {`To ${getNetworkName(l1.network.id)}`}
            </TabButton>
            {isEOA && (
              <TabButton
                aria-label="show CCTP (Native USDC) transactions"
                className={`${roundedTabClasses} roundedTabLeft`}
              >
                {/* CCTP */}
                <Image
                  src={getNetworkLogo(l1.network.id)}
                  className="h-6 w-auto"
                  alt="Withdraw"
                  width={24}
                  height={24}
                />
                {'CCTP (Native USDC)'}
              </TabButton>
            )}
          </Tab.List>
          <Tab.Panel className="overflow-auto">
            <TransactionsTable
              type="deposits"
              pageParams={depositsPageParams}
              setPageParams={setDepositsPageParams}
              transactions={depositsData.transformedDeposits}
              isSmartContractWallet={isSmartContractWallet}
              loading={depositsLoading}
              error={depositsError}
            />
          </Tab.Panel>
          <Tab.Panel className="overflow-auto">
            <TransactionsTable
              type="withdrawals"
              pageParams={withdrawalsPageParams}
              setPageParams={setWithdrawalsPageParams}
              transactions={withdrawalsData.transformedWithdrawals}
              isSmartContractWallet={isSmartContractWallet}
              loading={withdrawalsLoading}
              error={withdrawalsError}
            />
          </Tab.Panel>
          {isEOA && (
            <Tab.Panel className="overflow-auto">
              <TransactionsTableCctp />
            </Tab.Panel>
          )}
        </Tab.Group>
      </div>
    </div>
  )
}
