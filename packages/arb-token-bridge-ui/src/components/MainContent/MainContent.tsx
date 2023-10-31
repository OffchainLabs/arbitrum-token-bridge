import { motion, AnimatePresence } from 'framer-motion'
import useLocalStorage from '@rehooks/local-storage'

import { TransferPanel } from '../TransferPanel/TransferPanel'
import { SidePanel } from '../common/SidePanel'
import { useAppContextActions, useAppContextState } from '../App/AppContext'
import { ArbitrumStats, statsLocalStorageKey } from './ArbitrumStats'
import { SettingsDialog } from '../common/SettingsDialog'
import { NewTransactionHistory } from '../NewTransactionHistory/NewTransactionHistory'
import { useCompleteMultiChainTransactions } from '../../hooks/useCompleteMultiChainTransactions'

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
  const { closeTransactionHistoryPanel } = useAppContextActions()
  const {
    layout: { isTransactionHistoryPanelVisible }
  } = useAppContextState()

  const [isArbitrumStatsVisible] =
    useLocalStorage<boolean>(statsLocalStorageKey)

  const {
    data: { transactions },
    loading,
    completed,
    error,
    resume
  } = useCompleteMultiChainTransactions()

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
        heading="Transaction history"
        isOpen={isTransactionHistoryPanelVisible}
        onClose={closeTransactionHistoryPanel}
      >
        <NewTransactionHistory
          transactions={transactions}
          loading={loading}
          completed={completed}
          error={error}
          resume={resume}
        />
      </SidePanel>

      {/* Settings panel */}
      <SettingsDialog />

      {/* Toggle-able Stats for nerds */}
      {isArbitrumStatsVisible && <ArbitrumStats />}
    </div>
  )
}
