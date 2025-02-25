import { create } from 'zustand'

export type RouteType = 'arbitrum' | 'oftV2' | 'cctp'
export type RouteContext = null
export type SetRoute = (route: RouteType, context?: RouteContext) => void
interface RouteState {
  selectedRoute: RouteType | undefined
  context: RouteContext | undefined
  setSelectedRoute: SetRoute
  clearRoute: () => void
}

export const useRouteStore = create<RouteState>()(set => ({
  selectedRoute: undefined,
  context: undefined,
  setSelectedRoute: (route, context) =>
    set({
      selectedRoute: route,
      context
    }),
  clearRoute: () => set({ selectedRoute: undefined, context: undefined })
}))
