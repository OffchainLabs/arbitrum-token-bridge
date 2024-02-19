import { twMerge } from 'tailwind-merge'
import { usePostHog } from 'posthog-js/react'
import { useCallback } from 'react'
import { ChevronLeftIcon } from '@heroicons/react/24/outline'

import { SidebarMenu } from './SidebarMenu'
import { SidebarFooter } from './SidebarFooter'
import { SidebarHeader } from './SidebarHeader'
import { useSidebarStore } from './SidebarStore'

// Desktop Sidebar
export const Sidebar = () => {
  const posthog = usePostHog()
  const { sidebarOpened, setSidebarOpened, setSidebarOpenedAndSave } =
    useSidebarStore()

  const clickSidePanel = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!sidebarOpened) {
        setSidebarOpened(true)
        event.preventDefault()
      }
    },
    [sidebarOpened, setSidebarOpened]
  )

  const sidebarToggleClick = () => {
    try {
      // capture analytics event before state changes to avoid state-syncing issues
      posthog?.capture('Sidebar Toggle Clicks', {
        Toggle: sidebarOpened ? 'Collapse' : 'Expand'
      })
    } catch {
      // no-op
    }

    // if user actually collapses or opens a sidebar, then persist their preference in local-storage
    setSidebarOpenedAndSave(!sidebarOpened)
  }

  return (
    <div
      className={twMerge(
        'relative z-10 hidden flex-col justify-between border-r border-gray-6 bg-black pt-[30px] font-normal transition-all duration-200',
        'h-full shrink-0 sm:sticky sm:top-0 sm:flex sm:h-screen', // show the sidebar in md/lg+ resolutions, for sm revert to Header
        sidebarOpened ? 'w-[256px]' : 'w-[60px] cursor-pointer'
      )}
      onClick={clickSidePanel}
    >
      {/* Sidebar toggle button */}
      <button
        className={twMerge(
          'absolute right-[-16px] top-[60px] flex h-[32px] w-[32px] cursor-pointer items-center justify-center rounded-full border border-gray-6 bg-gray-1 transition duration-200',
          !sidebarOpened && 'rotate-180'
        )}
        onClick={sidebarToggleClick}
      >
        <ChevronLeftIcon className="h-[12px] w-[12px] text-gray-6" />
      </button>

      {/* Sidebar - Top Arbitrum Logo */}
      <SidebarHeader />

      {/* Sidebar - Menu items */}
      <SidebarMenu />

      {/* Sidebar - footer */}
      {sidebarOpened && <SidebarFooter />}
    </div>
  )
}
