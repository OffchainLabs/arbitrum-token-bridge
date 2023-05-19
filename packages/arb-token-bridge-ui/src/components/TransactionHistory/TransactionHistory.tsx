import { Tab } from '@headlessui/react'
import { Dispatch, SetStateAction, useMemo } from 'react'
import { CompleteDepositData } from '../../hooks/useDeposits'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { CompleteWithdrawalData } from '../../hooks/useWithdrawals'
import { useAppState } from '../../state'
import {
  getExplorerUrl,
  getNetworkLogo,
  getNetworkName,
  isNetwork
} from '../../util/networks'
import {
  PageParams,
  TransactionsTable
} from './TransactionsTable/TransactionsTable'
import { PendingTransactions } from './PendingTransactions'
import { FailedTransactionsWarning } from './FailedTransactionsWarning'
import { isFailed, isPending } from '../../state/app/utils'
import Image from 'next/image'
import { TabButton } from '../common/Tab'
import { MAX_EVENT_LOG_BLOCK_DIFF } from '../../util/withdrawals/fetchWithdrawals'
import { InformationCircleIcon } from '@heroicons/react/24/outline'
import { formatAmount } from '../../util/NumberUtils'
import { ExternalLink } from '../common/ExternalLink'

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

  const { isArbitrumNova } = isNetwork(l2.network.chainID)
  const {
    app: {
      arbTokenBridge: { walletAddress }
    }
  } = useAppState()

  const {
    app: { mergedTransactions }
  } = useAppState()

  const pendingTransactions = useMemo(() => {
    return mergedTransactions?.filter(tx => isPending(tx))
  }, [mergedTransactions])

  const failedTransactions = useMemo(() => {
    return mergedTransactions?.filter(tx => isFailed(tx))
  }, [mergedTransactions])

  const roundedTabClasses =
    'roundedTab ui-not-selected:arb-hover roundedTabRight relative flex flex-row flex-nowrap items-center gap-2 rounded-tl-lg rounded-tr-lg px-4 py-2 text-base ui-selected:bg-white ui-not-selected:text-white'

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

      {/* Nova blocks limited warning */}
      {isArbitrumNova && (
        <div className="flex items-center gap-1 rounded-md bg-orange p-2 text-sm text-dark lg:flex-nowrap">
          <InformationCircleIcon className="h-4 w-4" />
          Tx history currently shows Nova withdrawals limited to the latest{' '}
          {formatAmount(MAX_EVENT_LOG_BLOCK_DIFF)} blocks.
          <ExternalLink
            href={`${getExplorerUrl(
              l2.network.chainID
            )}/address/${walletAddress}#withdrawaltxs`}
            className="arb-hover cursor-pointer text-sm text-blue-link underline"
          >
            Check all withdrawals here.
          </ExternalLink>
        </div>
      )}

      {/* Transaction history table */}
      <div>
        <Tab.Group>
          <Tab.List className={'flex flex-row whitespace-nowrap'}>
            <TabButton
              aria-label="show deposit transactions"
              className={`${roundedTabClasses}`}
            >
              {/* Deposits */}
              <Image
                src={getNetworkLogo(l2.network.chainID)}
                className="h-6 w-auto"
                alt="Deposit"
                height={24}
                width={24}
              />
              {`To ${getNetworkName(l2.network.chainID)}`}
            </TabButton>
            <TabButton
              aria-label="show withdrawal transactions"
              className={`${roundedTabClasses} roundedTabLeft`}
            >
              {/* Withdrawals */}
              <Image
                src={getNetworkLogo(l1.network.chainID)}
                className="h-6 w-auto"
                alt="Withdraw"
                width={24}
                height={24}
              />
              {`To ${getNetworkName(l1.network.chainID)}`}
            </TabButton>
          </Tab.List>
          <Tab.Panel className="overflow-auto">
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
            <TransactionsTable
              type="withdrawals"
              pageParams={withdrawalsPageParams}
              setPageParams={setWithdrawalsPageParams}
              transactions={withdrawalsData.transformedWithdrawals}
              loading={withdrawalsLoading}
              error={withdrawalsError}
            />
          </Tab.Panel>
        </Tab.Group>
      </div>
    </div>
  )
}
