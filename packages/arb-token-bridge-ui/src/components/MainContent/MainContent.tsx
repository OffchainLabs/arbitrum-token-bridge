import { motion, AnimatePresence } from 'framer-motion'
import { TransferPanel } from '../TransferPanel/TransferPanel'
import { ExploreArbitrum } from './ExploreArbitrum'
import { TransactionHistory } from '../TransactionHistory/TransactionHistory'
import { SidePanel } from '../common/SidePanel'
import { useAppContextDispatch, useAppContextState } from '../App/AppContext'
import { useAppState } from '../../state'
import { useEffect, useState } from 'react'
import { useDeposits } from '../../hooks/useDeposits'
import { PageParams } from '../TransactionHistory/TransactionsTable/TransactionsTable'
import { useWithdrawals } from '../../hooks/useWithdrawals'
import { TransactionStatusInfo } from '../TransactionHistory/TransactionStatusInfo'

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
    app: { arbTokenBridge }
  } = useAppState()

  const [depositsPageParams, setDepositsPageParams] = useState<PageParams>({
    searchString: '',
    pageNumber: 0,
    pageSize: 10
  })

  const [withdrawalsPageParams, setWithdrawalsPageParams] =
    useState<PageParams>({
      searchString: '',
      pageNumber: 0,
      pageSize: 10
    })

  const {
    data: depositsData = {
      deposits: [],
      pendingDeposits: [],
      transformedDeposits: []
    },
    isValidating: depositsLoading,
    error: depositsError
  } = useDeposits(depositsPageParams)

  const {
    data: withdrawalsData = {
      withdrawals: [],
      pendingWithdrawals: [],
      transformedWithdrawals: []
    },
    isValidating: withdrawalsLoading,
    error: withdrawalsError
  } = useWithdrawals(withdrawalsPageParams)

  useEffect(() => {
    // if pending deposits found, add them in the store - this will add them to pending div + start polling for their status
    arbTokenBridge?.transactions?.setDepositsInStore?.(
      depositsData.pendingDeposits
    )
  }, [JSON.stringify(depositsData.pendingDeposits)]) // only run side effect on value change, not reference (Call stack exceeded)

  useEffect(() => {
    // if pending withdrawals found, add them in the store - this will add them to pending div + start polling for their status
    arbTokenBridge?.setWithdrawalsInStore?.(withdrawalsData.pendingWithdrawals)
  }, [JSON.stringify(withdrawalsData.pendingWithdrawals)]) // only run side effect on value change, not reference (Call stack exceeded)

  return (
    <div className="flex w-full justify-center">
      <div className="w-full max-w-screen-lg flex-col space-y-6">
        {/* if the user has some pending claim txns or retryables to redeem, show that banner here */}
        <TransactionStatusInfo deposits={depositsData.transformedDeposits} />

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
        {/* Transaction history - pending transactions + history table */}
        <TransactionHistory
          {...{
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
          }}
        />
      </SidePanel>
    </div>
  )
}
