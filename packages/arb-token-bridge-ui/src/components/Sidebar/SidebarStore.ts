import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useLocalStorage, useWindowSize } from 'react-use'
import { create } from 'zustand'

import { SIDEBAR_OPEN_PREFERENCE_KEY } from '../../constants'

type SidebarStore = {
  sidebarOpened: boolean
  activeMenu: string
  setSidebarOpened: (value: boolean) => void
  setActiveMenu: (value: string) => void
}

export const sidebarStore = create<SidebarStore>(set => ({
  sidebarOpened: false, // keep it false until the component mounts, then calculate if we really want to open it
  activeMenu: 'bridge',
  setSidebarOpened: (value: boolean) =>
    set(store => ({ ...store, sidebarOpened: value })),
  setActiveMenu: (value: string) =>
    set(store => ({ ...store, activeMenu: value }))
}))

export const useSidebarStore = () => {
  const [sidebarOpenedLocalStorage, setSidebarOpenedLocalStorage] =
    useLocalStorage<boolean>(SIDEBAR_OPEN_PREFERENCE_KEY)

  const { sidebarOpened, setSidebarOpened, activeMenu, setActiveMenu } =
    sidebarStore()

  const { width } = useWindowSize()

  const pathname = usePathname()

  useEffect(() => {
    // on app mount/width change, taking into account screen size and user preference, calculate if we want to keep the sidebar expanded or collapsed
    const calculateSidebarState = () => {
      // on mobile, always keep sidebar menu full-width
      if (width < 640) return true

      // on mid/large screens, if user has force-set sidebar preference to false (`collapsed`), then keep it collapsed, else let the screen size decide
      if (sidebarOpenedLocalStorage === false) {
        return false
      }
      return width >= 768 // collapse in mid-sized screens, else open it
    }

    setSidebarOpened(calculateSidebarState())

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width])

  useEffect(() => {
    if (pathname === '/') {
      setActiveMenu('bridge')
    }
    if (pathname.includes('/projects')) {
      setActiveMenu('projects')
    }

    if (pathname.includes('/missions')) {
      setActiveMenu('missions')
    }
  }, [pathname, setActiveMenu])

  // set sidebar-open and persist in LS
  const setSidebarOpenedAndSave = (value: boolean) => {
    setSidebarOpened(value)
    setSidebarOpenedLocalStorage(value)
  }

  return {
    sidebarOpened,
    setSidebarOpened,
    setSidebarOpenedAndSave,
    activeMenu,
    setActiveMenu
  }
}
