import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useLocalStorage from '@rehooks/local-storage'
import { useAccount } from 'wagmi'

import { TransferPanel } from '../TransferPanel/TransferPanel'
import { SidePanel } from '../common/SidePanel'
import { useAppContextActions, useAppContextState } from '../App/AppContext'
import { ArbitrumStats, statsLocalStorageKey } from './ArbitrumStats'
import { SettingsDialog } from '../common/SettingsDialog'
import { TransactionHistory } from '../TransactionHistory/TransactionHistory'
import { useTransactionHistory } from '../../hooks/useTransactionHistory'
import { isTxPending } from '../TransactionHistory/helpers'

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
  const { address } = useAccount()
  const { closeTransactionHistoryPanel } = useAppContextActions()
  const transactionHistoryProps = useTransactionHistory(address, true)
  const {
    layout: { isTransactionHistoryPanelVisible }
  } = useAppContextState()

  const [isArbitrumStatsVisible] =
    useLocalStorage<boolean>(statsLocalStorageKey)

  const {
    data: { transactions },
    updatePendingTransaction
  } = transactionHistoryProps

  useEffect(() => {
    const interval = setInterval(() => {
      transactions.forEach(tx => {
        if (isTxPending(tx)) {
          updatePendingTransaction(tx)
        }
      })
    }, 10_000)

    return () => clearInterval(interval)
  }, [transactions, updatePendingTransaction])

  return (
    <div className="flex w-full justify-center">
      <div className="main-panel w-full max-w-screen-lg flex-col space-y-6">
        <div className="hidden text-center text-5xl">Arbitrum Token Bridge</div>

        <AnimatePresence>
          <motion.div
            key="transfer-panel"
            {...motionDivProps}
            className="relative z-10"
          >
            <TransferPanel />
          </motion.div>
        </AnimatePresence>
      </div>
      <SidePanel
        isOpen={isTransactionHistoryPanelVisible}
        heading="Transaction History"
        onClose={closeTransactionHistoryPanel}
        scrollable={false}
      >
        <TransactionHistory props={{ ...transactionHistoryProps, address }} />
      </SidePanel>

      {/* Settings panel */}
      <SettingsDialog />

      {/* Toggle-able Stats for nerds */}
      {isArbitrumStatsVisible && <ArbitrumStats />}
    </div>
  )
}
