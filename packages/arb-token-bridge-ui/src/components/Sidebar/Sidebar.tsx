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
    /** position: sticky element has attachment issues when parent doesn't have fixed height
     * so we need the content to be in a position: fixed parent
     * and this sticky element would serve as a placeholder for the sidebar
     * so that it pushes the content to the right
     */
    <div
      className={twMerge(
        'z-20 hidden h-full shrink-0 transition-all duration-200 sm:sticky sm:top-0 sm:flex sm:h-screen', // show the sidebar in md/lg+ resolutions, for sm revert to Header
        sidebarOpened ? 'w-[256px]' : 'w-[60px]'
      )}
    >
      <div
        className={twMerge(
          'relative flex-col justify-between border-r border-gray-6 bg-black pt-[30px] font-normal transition-all duration-200',
          'sm:fixed sm:left-0 sm:top-0 sm:flex sm:h-screen', // show the sidebar in md/lg+ resolutions, for sm revert to Header
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
    </div>
  )
}
