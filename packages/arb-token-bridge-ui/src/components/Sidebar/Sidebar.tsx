import { twMerge } from 'tailwind-merge'
import { useCallback } from 'react'

import { SidebarMenu } from './SidebarMenu'
import { SidebarFooter } from './SidebarFooter'
import { SidebarHeader } from './SidebarHeader'
import { useSidebarStore } from './SidebarStore'

export const Sidebar = () => {
  const { sidebarOpened, setSidebarOpened } = useSidebarStore()

  const clickSidePanel = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!sidebarOpened) {
        setSidebarOpened(true)
        event.preventDefault()
      }
    },
    [sidebarOpened, setSidebarOpened]
  )

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
