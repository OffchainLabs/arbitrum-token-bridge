import { motion, AnimatePresence } from 'framer-motion'
import { TransferPanel } from '../TransferPanel/TransferPanel'
import { ExploreArbitrum } from './ExploreArbitrum'
import { TransactionHistory } from '../common/TransactionHistory'
import { SidePanel } from '../common/SidePanel'
import { useAppContextDispatch, useAppContextState } from '../App/AppContext'
import { PendingTransactions } from '../common/PendingTransactions'
import { useAppState } from '../../state'
import { usePendingTransactions } from '../../hooks/usePendingTransactions'
import { useEffect } from 'react'

export const motionDivProps = {
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

export function MainContent() {
  const dispatch = useAppContextDispatch()
  const {
    layout: { isTransactionHistoryPanelVisible }
  } = useAppContextState()
  function closeTransactionHistory() {
    dispatch({ type: 'layout.set_txhistory_panel_visible', payload: false })
  }

  const {
    app: { mergedTransactions, arbTokenBridge }
  } = useAppState()

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
      pendingTxns?.pendingWithdrawals || []
    )
  }, [pendingTxns])

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
          <>
            <motion.div key="explore-arbitrum" {...motionDivProps}>
              <ExploreArbitrum />
            </motion.div>

            <div className="h-[25vh]" />
          </>
        </AnimatePresence>
      </div>

      <SidePanel
        isOpen={isTransactionHistoryPanelVisible}
        heading="Transaction History"
        onClose={closeTransactionHistory}
      >
        <div className="flex flex-col justify-around gap-6">
          {/* Pending transactions cards */}
          <PendingTransactions
            loading={fetchingPendingTxns}
            transactions={mergedTransactions}
            error={errorFetchingPendingTxns}
          />

          {/* Transaction history table */}
          <TransactionHistory />
        </div>
      </SidePanel>
    </div>
  )
}
