import { twMerge } from 'tailwind-merge'
import { useCallback } from 'react'

import { SidebarMenu } from './SidebarMenu'
import { SidebarFooter } from './SidebarFooter'
import { SidebarHeader } from './SidebarHeader'
import { useSidebarStore } from './SidebarStore'

// Desktop Sidebar
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
    <div
      className={twMerge(
        'relative hidden flex-col justify-between border-r border-gray-6 bg-black pt-[30px] font-normal transition-all duration-200',
        'h-full md:flex lg:sticky lg:top-0 lg:h-screen', // show the sidebar in md/lg+ resolutions, for sm revert to Header
        sidebarOpened ? 'w-[256px]' : 'w-[48px] cursor-pointer'
      )}
      onClick={clickSidePanel}
    >
      {/* Sidebar - Top Arbitrum Logo */}
      <SidebarHeader />

      {/* Sidebar - Menu items */}
      <SidebarMenu />

      {/* Sidebar - footer */}
      {sidebarOpened && <SidebarFooter />}
    </div>
  )
}
