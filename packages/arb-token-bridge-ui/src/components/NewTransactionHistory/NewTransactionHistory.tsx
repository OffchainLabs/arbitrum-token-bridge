import { Tab } from '@headlessui/react'
import { useAccount } from 'wagmi'

import { useCompleteMultiChainTransactions } from '../../hooks/useMultiChainTransactionList'
import { TransactionHistoryTable } from './TransactionHistoryTable'
import { isTxCompleted } from './helpers'

export const NewTransactionHistory = () => {
  const { address } = useAccount()

  const {
    data: { transactions, total },
    loading,
    completed,
    paused
  } = useCompleteMultiChainTransactions()

  return (
    <Tab.Group key={address}>
      <Tab.List className="text-white">
        <button>Pending</button>
        <button>Done</button>
      </Tab.List>

      <Tab.Panel>
        {/* <TransactionHistoryTable
          transactions={transactions.filter(tx => !isTxCompleted(tx))}
          txCount={total}
          loading={loading}
        /> */}
        <span className="text-white">1</span>
      </Tab.Panel>
      <Tab.Panel>
        <span className="text-white">2</span>
      </Tab.Panel>
      {/* <Tab.Panel>
        <TransactionHistoryTable
          transactions={transactions.filter(isTxCompleted)}
          txCount={total}
          loading={loading}
        />
      </Tab.Panel> */}
    </Tab.Group>
  )
}
