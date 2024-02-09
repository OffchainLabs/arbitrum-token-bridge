'use client'

// The main side navigation component
import { twMerge } from 'tailwind-merge'
import { usePostHog } from 'posthog-js/react'
import { ChevronLeftIcon } from '@heroicons/react/24/outline'

import { SidebarMenu } from './SidebarMenu'
import { SidebarFooter } from './SidebarFooter'
import { SidebarHeader } from './SidebarHeader'
import { useSidebarStore } from './SidebarStore'

export const Sidebar = () => {
  const posthog = usePostHog()
  const { sidebarOpened, setSidebarOpened, setSidebarOpenedAndSave } =
    useSidebarStore()

  const clickSidePanel = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!sidebarOpened) {
      setSidebarOpened(true)
      event.preventDefault()
    }
  }

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
    <div className="sticky left-0 top-0 z-50 flex self-start text-gray-400">
      {/* Sidebar Desktop */}
      <div
        className={twMerge(
          'relative z-[1000] hidden h-screen flex-col justify-between border-r border-gray-600 bg-black pt-[30px] transition-all duration-200 sm:flex', // show the sidebar in md/lg+ resolutions, for sm revert to Header
          sidebarOpened ? 'w-64' : 'w-[60px] cursor-pointer'
        )}
        onClick={clickSidePanel}
      >
        <div
          className={twMerge(
            'shrink-0 grow-0',
            sidebarOpened ? 'px-4' : 'px-1'
          )}
        >
          {/* Sidebar toggle button */}
          <button
            className={twMerge(
              'bg-default-black absolute right-[-16px] top-[60px] z-[1000] flex h-[32px] w-[32px] cursor-pointer items-center justify-center rounded-full border border-gray-600 transition duration-200',
              !sidebarOpened && 'rotate-180'
            )}
            onClick={sidebarToggleClick}
          >
            <ChevronLeftIcon className="h-3 w-3 text-gray-600" />
          </button>

          {/* Sidebar - Top Arbitrum Logo */}
          <SidebarHeader />
        </div>

        {/* Sidebar - Menu items */}
        <SidebarMenu />

        {/* Sidebar - footer */}
        {sidebarOpened && <SidebarFooter />}
      </div>
    </div>
  )
}
