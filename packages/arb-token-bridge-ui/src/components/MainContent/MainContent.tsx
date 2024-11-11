import { useLocalStorage } from '@uidotdev/usehooks'
import { Tab } from '@headlessui/react'

import { TransferPanel } from '../TransferPanel/TransferPanel'
import { ArbitrumStats, statsLocalStorageKey } from './ArbitrumStats'
import { SettingsDialog } from '../common/SettingsDialog'
import { TransactionHistory } from '../TransactionHistory/TransactionHistory'
import { TopNavBar } from '../TopNavBar'

export function MainContent() {
  const [isArbitrumStatsVisible] =
    useLocalStorage<boolean>(statsLocalStorageKey)

  return (
    <>
      <div className="main-panel mx-auto flex w-full flex-col items-center gap-3 sm:pb-12 sm:pt-6">
        <Tab.Group>
          <TopNavBar />
          <Tab.Panels>
            {/* <Tab.Panel>BUY PANEL</Tab.Panel> */}
            <Tab.Panel className="sm:max-w-[600px]">
              <TransferPanel />
            </Tab.Panel>
            <Tab.Panel className="px-4">
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
