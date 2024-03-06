import { useEffect, useMemo } from 'react'
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
import { TransactionStatusInfo } from '../TransactionHistory/TransactionStatusInfo'
import { TransactionHistoryMini } from '../TransactionHistory/TransactionHistoryMini'

export function MainContent() {
  const { address } = useAccount()
  const { closeTransactionHistoryPanel } = useAppContextActions()
  const transactionHistoryProps = useTransactionHistory(address, {
    runFetcher: true
  })
  const {
    layout: { isTransactionHistoryPanelVisible }
  } = useAppContextState()

  const [isArbitrumStatsVisible] =
    useLocalStorage<boolean>(statsLocalStorageKey)

  const { transactions, updatePendingTransaction } = transactionHistoryProps

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
    <div className="flex w-full justify-center gap-4">
      <div className="main-panel flex w-full max-w-[600px] flex-col gap-2">
        <div className="hidden text-center text-5xl">Arbitrum Token Bridge</div>

        <TransactionStatusInfo />

        <TransferPanel />
      </div>

      <TransactionHistoryMini />

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
