import dynamic from 'next/dynamic'
import { useEffect, useMemo } from 'react'

import { useArbQueryParams } from '../hooks/useArbQueryParams'
import { useTransactionHistory } from '../hooks/useTransactionHistory'
import { Loader } from '../components/common/atoms/Loader'
import { TransactionHistory } from '../components/TransactionHistory/TransactionHistory'
import { isTxPending } from '../components/TransactionHistory/helpers'
import { ArbTokenBridgeStoreSyncWrapper } from '../components/App/App'

const App = dynamic(() => import('../components/App/App'), {
  ssr: false,
  loading: () => (
    <>
      <div className="h-12 w-full lg:h-16" />
      <div className="fixed inset-0 m-auto h-[44px] w-[44px]">
        <Loader size="large" color="white" />
      </div>
    </>
  )
})

function TransactionHistoryPageContent() {
  const [{ address }] = useArbQueryParams()

  const transactionHistoryProps = useTransactionHistory(address, {
    runFetcher: true
  })

  const { transactions, updatePendingTransaction } = transactionHistoryProps
  console.log('transactions? ', transactions)

  const pendingTransactions = useMemo(() => {
    return transactions.filter(isTxPending)
  }, [transactions])

  useEffect(() => {
    const interval = setInterval(() => {
      pendingTransactions.forEach(updatePendingTransaction)
    }, 10_000)

    return () => clearInterval(interval)
  }, [pendingTransactions, updatePendingTransaction])

  return (
    <div className="flex w-full flex-col items-center space-y-4 px-8 py-4 text-center lg:py-0">
      <h1>Transaction History</h1>
      {/* <ArbTokenBridgeStoreSyncWrapper /> */}
      <TransactionHistory props={{ ...transactionHistoryProps, address }} />
    </div>
  )
}

export default function TransactionHistoryPage() {
  return (
    <App>
      <TransactionHistoryPageContent />
    </App>
  )
}
