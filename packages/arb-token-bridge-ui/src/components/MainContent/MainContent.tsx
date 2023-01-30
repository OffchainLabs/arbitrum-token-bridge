import { motion, AnimatePresence } from 'framer-motion'

import { useActions, useAppState } from '../../state'
import { MergedTransaction } from '../../state/app/state'
import { DepositCard } from '../TransferPanel/DepositCard'
import { WithdrawalCard } from '../TransferPanel/WithdrawalCard'
import { TransferPanel } from '../TransferPanel/TransferPanel'
import { ExploreArbitrum } from './ExploreArbitrum'
import { TransactionHistory } from '../common/TransactionHistory'
import { SidePanel } from '../common/SidePanel'
import { usePendingTransactions } from '../TransactionsTable/usePendingTransactions'

const motionDivProps = {
  layout: true,
  initial: {
    opacity: 0,
    scale: 0.9
  },
  animate: {
    opacity: 1,
    scale: 1
  },
  exit: {
    opacity: 0,
    scale: 0.9
  }
}

const L2ToL1MessageStatuses = ['Unconfirmed', 'Confirmed', 'Executed']

function isDeposit(tx: MergedTransaction) {
  return tx.direction === 'deposit' || tx.direction === 'deposit-l1'
}

function isWithdrawalInitiation(tx: MergedTransaction) {
  return tx.direction === 'withdraw'
}

function isL2ToL1Message(tx: MergedTransaction) {
  return tx.direction === 'outbox' && L2ToL1MessageStatuses.includes(tx.status)
}

function dedupeWithdrawals(transactions: MergedTransaction[]) {
  const map: {
    [txHash: string]: MergedTransaction
  } = {}

  transactions.forEach(tx => {
    // If it's a withdrawal initiation tx - try to find the matching transformed L2-to-L1 message.
    // If found - use that. If not - use the withdrawal initiation tx, as it still might be pending.
    if (isWithdrawalInitiation(tx)) {
      if (typeof map[tx.txId] !== 'undefined') {
        return
      }

      const matchingL2ToL1Message = transactions.find(
        _tx => tx.txId === _tx.txId && isL2ToL1Message(_tx)
      )

      if (matchingL2ToL1Message) {
        map[tx.txId] = matchingL2ToL1Message
      } else {
        map[tx.txId] = tx
      }
    } else {
      map[tx.txId] = tx
    }
  })

  return Object.values(map)
}

export function MainContent() {
  const {
    app: { mergedTransactions, pwLoadedState, showTransactionHistory }
  } = useAppState()
  const actions = useActions()

  const {
    data: pendingTxns,
    isValidating: fetchingPendingTxns,
    error: errorFetchingPendingTxns
  } = usePendingTransactions()

  return (
    <div className="flex w-full justify-center">
      <div className="w-full max-w-screen-lg flex-col space-y-6">
        <AnimatePresence>
          <motion.div
            key="transfer-panel"
            {...motionDivProps}
            className="relative z-10"
          >
            <TransferPanel />
          </motion.div>
        </AnimatePresence>

        <AnimatePresence>
          {!fetchingPendingTxns && !pendingTxns?.length && (
            <>
              <motion.div key="explore-arbitrum" {...motionDivProps}>
                <ExploreArbitrum />
              </motion.div>

              <div className="h-[25vh]" />
            </>
          )}
        </AnimatePresence>
      </div>

      <SidePanel
        isOpen={showTransactionHistory}
        heading="Transaction History"
        onClose={() => {
          actions.app.setShowTransactionHistory(false)
        }}
      >
        <div className="flex flex-col justify-around gap-6">
          {/* Pending unseen transaction cards */}
          <div className="flex max-h-[500px] flex-col gap-4 overflow-scroll rounded-lg bg-blue-arbitrum p-4">
            {fetchingPendingTxns
              ? 'Loading pending transactions...'
              : errorFetchingPendingTxns
              ? 'Error loading transactions...'
              : null}

            {pendingTxns?.map(tx =>
              isDeposit(tx) ? (
                <motion.div key={tx.txId} {...motionDivProps}>
                  <DepositCard key={tx.txId} tx={tx} />
                </motion.div>
              ) : (
                <motion.div key={tx.txId} {...motionDivProps}>
                  <WithdrawalCard key={tx.txId} tx={tx} />
                </motion.div>
              )
            )}
          </div>

          {/* Transaction history table */}
          <div>
            <TransactionHistory />
          </div>
        </div>
      </SidePanel>
    </div>
  )
}
