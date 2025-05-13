import { LifiData } from '@/token-bridge-sdk/LifiTransferStarter'
import { create } from 'zustand'
import { MergedTransactionLifiData } from '../../../state/app/state'
import { LiFiStep } from '@lifi/sdk'

export type RouteType =
  | 'arbitrum'
  | 'oftV2'
  | 'cctp'
  | 'lifi-fastest'
  | 'lifi-cheapest'
  | 'lifi' // If fastest and cheapest quotes are the same
/** When route is in context, we didn't fetch transactionRequest yet and we only have information about the step */
export type RouteContext = LifiData &
  Omit<MergedTransactionLifiData, 'transactionRequest'> & { step: LiFiStep }
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

export function isLifiRoute(selectedRoute: RouteType | undefined) {
  return (
    selectedRoute === 'lifi' ||
    selectedRoute === 'lifi-cheapest' ||
    selectedRoute === 'lifi-fastest'
  )
}
