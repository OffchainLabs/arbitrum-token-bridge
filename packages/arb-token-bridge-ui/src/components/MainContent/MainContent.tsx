import { motion, AnimatePresence } from 'framer-motion'

import { useAppState } from '../../state'
import { MergedTransaction } from '../../state/app/state'
import { DepositCard } from '../TransferPanel/DepositCard'
import { WithdrawalCard } from '../TransferPanel/WithdrawalCard'
import { TransferPanel } from '../TransferPanel/TransferPanel'
import { ExploreArbitrum } from './ExploreArbitrum'
import { TransactionHistory } from '../common/TransactionHistory'
import { SidePanel } from '../common/SidePanel'
import { usePendingTransactions } from '../TransactionsTable/usePendingTransactions'
import { useEffect } from 'react'
import { outgoungStateToString } from '../../state/app/utils'
import { OutgoingMessageState } from 'token-bridge-sdk'
import { useAppContextDispatch, useAppContextState } from '../App/AppContext'
import { InformationCircleIcon } from '@heroicons/react/outline'
import Loader from 'react-loader-spinner'

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

export function MainContent() {
  const {
    app: { mergedTransactions, arbTokenBridge }
  } = useAppState()
  const dispatch = useAppContextDispatch()
  const {
    layout: { isTransactionHistoryPanelVisible }
  } = useAppContextState()

  const {
    data: pendingTxns,
    isValidating: fetchingPendingTxns,
    error: errorFetchingPendingTxns
  } = usePendingTransactions()

  useEffect(() => {
    // if pending deposits found, add them in the store
    arbTokenBridge?.transactions?.setDepositsInStore?.(
      pendingTxns?.pendingDeposits || []
    )

    // if pending withdrawals found, add them in the store
    arbTokenBridge?.setWithdrawalsInStore?.(
      pendingTxns?.pendingWithrawals || []
    )
  }, [pendingTxns])

  function closeTransactionHistory() {
    dispatch({ type: 'layout.set_txhistory_panel_visible', payload: false })
  }

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
          {!fetchingPendingTxns &&
            !pendingTxns?.pendingMergedTransactions.length && (
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
        isOpen={isTransactionHistoryPanelVisible}
        heading="Transaction History"
        onClose={closeTransactionHistory}
      >
        <div className="flex flex-col justify-around gap-6">
          {/* Pending transaction cards */}
          <div className="relative flex max-h-[500px] flex-col gap-4 overflow-scroll rounded-lg bg-blue-arbitrum p-4">
            <span className="flex items-center gap-x-3 text-xl text-white">
              {fetchingPendingTxns ? (
                <Loader type="TailSpin" color="white" width={20} height={20} />
              ) : null}
              Pending Transactions
            </span>
            {errorFetchingPendingTxns && (
              <span className="flex gap-x-2 text-sm text-red-400">
                <InformationCircleIcon className="h-5 w-5" aria-hidden="true" />
                Failed to load pending transactions
              </span>
            )}

            {mergedTransactions
              ?.filter(
                tx =>
                  (isDeposit(tx) && tx.status === 'pending') ||
                  (!isDeposit(tx) &&
                    tx.status !==
                      outgoungStateToString[OutgoingMessageState.EXECUTED])
              )
              ?.map(tx =>
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
