import { motion, AnimatePresence } from 'framer-motion'
import useLocalStorage from '@rehooks/local-storage'

import { TransferPanel } from '../TransferPanel/TransferPanel'
import { SidePanel } from '../common/SidePanel'
import { useAppContextActions, useAppContextState } from '../App/AppContext'
import { ArbitrumStats, statsLocalStorageKey } from './ArbitrumStats'
import { SettingsDialog } from '../common/SettingsDialog'
import { NewTransactionHistory } from '../NewTransactionHistory/NewTransactionHistory'

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

  return (
    <div className="flex w-full justify-center">
      <div className="main-panel w-full max-w-screen-lg flex-col space-y-6">
        <div className="hidden text-center text-5xl">Arbitrum Token Bridge</div>

        {/* if the user has some pending claim txns or retryables to redeem, show that banner here */}

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
      >
        <NewTransactionHistory />
      </SidePanel>

      {/* Settings panel */}
      <SettingsDialog />

      {/* Toggle-able Stats for nerds */}
      {isArbitrumStatsVisible && <ArbitrumStats />}
    </div>
  )
}
