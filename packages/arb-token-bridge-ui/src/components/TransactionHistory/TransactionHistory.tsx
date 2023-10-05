import { Tab } from '@headlessui/react'
import { Dispatch, SetStateAction, useMemo } from 'react'
import { useAccount } from 'wagmi'
import { twMerge } from 'tailwind-merge'

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
import { useCctpFetching, useCctpState } from '../../state/cctpState'
import { MergedTransaction } from '../../state/app/state'
import dayjs from 'dayjs'
import { TransactionsTableCctp } from './TransactionsTable/TransactionsTableCctp'
import { CustomMessageWarning } from './CustomMessageWarning'

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
    pendingIds: pendingIdsCctp,
    transfers: transfersCctp,
    transfersIds
  } = useCctpState()
  const { address } = useAccount()
  const { isLoadingDeposits, depositsError: cctpDepositsError } =
    useCctpFetching({
      l1ChainId: l1.network.id,
      l2ChainId: l2.network.id,
      walletAddress: address,
      pageSize: 10,
      pageNumber: 0,
      type: 'deposits'
    })
  const { isLoadingWithdrawals, withdrawalsError: cctpWithdrawalsError } =
    useCctpFetching({
      l1ChainId: l1.network.id,
      l2ChainId: l2.network.id,
      walletAddress: address,
      pageSize: 10,
      pageNumber: 0,
      type: 'withdrawals'
    })

  const {
    app: { mergedTransactions }
  } = useAppState()

  const isLoading =
    depositsLoading ||
    withdrawalsLoading ||
    isLoadingDeposits ||
    isLoadingWithdrawals
  const error =
    depositsError ||
    withdrawalsError ||
    cctpDepositsError ||
    cctpWithdrawalsError

  const isOrbitChainSelected = isNetwork(l2.network.id).isOrbitChain

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
    'roundedTab ui-not-selected:arb-hover relative flex flex-row flex-nowrap items-center gap-0.5 md:gap-2 rounded-tl-lg rounded-tr-lg px-2 md:px-4 py-2 text-base ui-selected:bg-white ui-not-selected:text-white justify-center md:justify-start grow md:grow-0'

  const displayCctp = transfersIds.length > 0 && !isOrbitChainSelected

  return (
    <div className="flex flex-col justify-around gap-6">
      {isNetwork(l2.network.id).isOrbitChain && (
        <CustomMessageWarning>
          Fetching transaction history details might be slower for Orbit chains.
        </CustomMessageWarning>
      )}
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
        <Tab.Group key={address}>
          <Tab.List className={'flex flex-row whitespace-nowrap'}>
            <TabButton
              aria-label="show deposit transactions"
              className={twMerge(roundedTabClasses, 'roundedTabRight')}
            >
              {/* Deposits */}
              <Image
                src={getNetworkLogo(l2.network.id)}
                className="hidden h-6 w-auto md:block"
                alt="Deposit"
                height={24}
                width={24}
              />
              <span className="text-xs md:text-base">{`To ${getNetworkName(
                l2.network.id
              )}`}</span>
            </TabButton>
            <TabButton
              aria-label="show withdrawal transactions"
              className={twMerge(
                roundedTabClasses,
                'roundedTabLeft',
                // Withdrawal tab only has rounded right border on large screens or on small screen if there is CCTP
                displayCctp ? 'roundedTabRight' : 'md:roundedTabRight'
              )}
            >
              {/* Withdrawals */}
              <Image
                src={getNetworkLogo(l1.network.id)}
                className="hidden h-6 w-auto md:block"
                alt="Withdraw"
                width={24}
                height={24}
              />
              <span className="text-xs md:text-base">{`To ${getNetworkName(
                l1.network.id
              )}`}</span>
            </TabButton>
            {displayCctp && (
              <TabButton
                aria-label="show CCTP (Native USDC) transactions"
                className={twMerge(
                  roundedTabClasses,
                  'roundedTabLeft',
                  'md:roundedTabRight'
                )}
              >
                {/* CCTP */}
                <Image
                  src="/icons/cctp.svg"
                  className="hidden h-6 w-auto md:block"
                  alt="Cross-Chain Transfer Protocol (Native USDC)"
                  width={24}
                  height={24}
                />
                <span className="hidden text-base md:block">
                  Cross-Chain Transfer Protocol (Native USDC)
                </span>
                <span className="text-xs md:hidden">CCTP (Native USDC)</span>
              </TabButton>
            )}
          </Tab.List>

          <Tab.Panel className="overflow-auto">
            <div className="sticky h-2 rounded-tr-lg bg-white" />
            <TransactionsTable
              type="deposits"
              pageParams={depositsPageParams}
              setPageParams={setDepositsPageParams}
              transactions={depositsData.transformedDeposits}
              loading={depositsLoading}
              error={depositsError}
            />
          </Tab.Panel>
          <Tab.Panel className="overflow-auto">
            <div
              className={twMerge(
                'sticky h-2 rounded-tl-lg bg-white',
                displayCctp ? 'rounded-tr-lg' : 'md:rounded-tr-lg'
              )}
            />
            <TransactionsTable
              type="withdrawals"
              pageParams={withdrawalsPageParams}
              setPageParams={setWithdrawalsPageParams}
              transactions={withdrawalsData.transformedWithdrawals}
              loading={withdrawalsLoading}
              error={withdrawalsError}
            />
          </Tab.Panel>
          {displayCctp && (
            <Tab.Panel className="overflow-auto">
              <div className="sticky h-2 rounded-tl-lg bg-white md:rounded-tr-lg" />
              <TransactionsTableCctp />
            </Tab.Panel>
          )}
        </Tab.Group>
      </div>
    </div>
  )
}
