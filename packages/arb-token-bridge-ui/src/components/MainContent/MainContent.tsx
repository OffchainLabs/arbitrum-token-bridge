import { useLocalStorage } from '@uidotdev/usehooks'
import { Tab } from '@headlessui/react'
import { create } from 'zustand'

import { TransferPanel } from '../TransferPanel/TransferPanel'
import { ArbitrumStats, statsLocalStorageKey } from './ArbitrumStats'
import { SettingsDialog } from '../common/SettingsDialog'
import { TransactionHistory } from '../TransactionHistory/TransactionHistory'
import { TopNavBar } from '../TopNavBar'
import { useBalanceUpdater } from '../syncers/useBalanceUpdater'

enum MainContentTabs {
  Bridge = 0,
  TransactionHistory = 1
}

type MainContentTabStore = {
  selectedTab: MainContentTabs
  setSelectedTab: (index: MainContentTabs) => void
  switchToBridgeTab: () => void
  switchToTransactionHistoryTab: () => void
}

export const useMainContentTabs = create<MainContentTabStore>(set => ({
  selectedTab: MainContentTabs.Bridge,
  setSelectedTab: (index: MainContentTabs) => set({ selectedTab: index }),
  switchToBridgeTab: () => set({ selectedTab: MainContentTabs.Bridge }),
  switchToTransactionHistoryTab: () =>
    set({ selectedTab: MainContentTabs.TransactionHistory })
}))

export function MainContent() {
  const [isArbitrumStatsVisible] =
    useLocalStorage<boolean>(statsLocalStorageKey)
  const { selectedTab, setSelectedTab } = useMainContentTabs()

  useBalanceUpdater()

  return (
    <>
      <div className="main-panel mx-auto flex w-full flex-col items-center gap-3 sm:pt-6">
        <Tab.Group selectedIndex={selectedTab} onChange={setSelectedTab}>
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
