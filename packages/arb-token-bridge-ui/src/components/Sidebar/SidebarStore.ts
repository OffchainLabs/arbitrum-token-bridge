import { useEffect } from 'react'
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
  sidebarOpened: true,
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
