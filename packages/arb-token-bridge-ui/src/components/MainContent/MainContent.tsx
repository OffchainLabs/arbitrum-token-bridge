import { useLocalStorage } from '@uidotdev/usehooks'
import { Tab } from '@headlessui/react'
import { create } from 'zustand'

import { TransferPanel } from '../TransferPanel/TransferPanel'
import { ArbitrumStats, statsLocalStorageKey } from './ArbitrumStats'
import { SettingsDialog } from '../common/SettingsDialog'
import { TransactionHistory } from '../TransactionHistory/TransactionHistory'
import { TopNavBar } from '../TopNavBar'
import { useTransactionHistoryUpdater } from '../TransactionHistory/useTransactionHistoryUpdater'

type SelectedTabIndexStore = {
  selectedIndex: number
  setSelectedIndex: (index: number) => void
  openTransactionHistory: () => void
}

export const useSelectedTabIndex = create<SelectedTabIndexStore>(set => ({
  selectedIndex: 0,
  setSelectedIndex: (index: number) => set({ selectedIndex: index }),
  openTransactionHistory: () => set({ selectedIndex: 1 })
}))

export function MainContent() {
  const [isArbitrumStatsVisible] =
    useLocalStorage<boolean>(statsLocalStorageKey)
  const { selectedIndex, setSelectedIndex } = useSelectedTabIndex()

  // without calling this, the site won't fetch the transactions and
  // hence we won't be able to determine the transaction status (the dot)
  useTransactionHistoryUpdater()

  return (
    <>
      <div className="main-panel mx-auto flex w-full flex-col items-center gap-3 sm:pt-6">
        <Tab.Group selectedIndex={selectedIndex} onChange={setSelectedIndex}>
          <TopNavBar />
          <Tab.Panels className="flex w-full items-center justify-center">
            <Tab.Panel className="w-full sm:max-w-[600px]">
              <TransferPanel />
            </Tab.Panel>
            <Tab.Panel className="w-full md:px-4">
              <TransactionHistory />
            </Tab.Panel>
          </Tab.Panels>
        </Tab.Group>
      </div>

      {/* Settings panel */}
      <SettingsDialog />

      {/* Toggle-able Stats for nerds */}
      {isArbitrumStatsVisible && <ArbitrumStats />}
    </>
  )
}
