import { LifiData } from '@/token-bridge-sdk/LifiTransferStarter'
import { create } from 'zustand'
import { MergedTransactionLifiData } from '../../../state/app/state'
import { LiFiStep } from '@lifi/sdk'
import { Address } from 'viem'
import { LifiCrosschainTransfersRoute } from '../../../pages/api/crosschain-transfers/lifi'
import { BigNumber } from 'ethers'
import { shallow } from 'zustand/shallow'

export type RouteType =
  | 'arbitrum'
  | 'oftV2'
  | 'cctp'
  | 'lifi-fastest'
  | 'lifi-cheapest'
  | 'lifi' // If fastest and cheapest quotes are the same

// Route data interfaces for different route types
export interface CctpRouteData {
  type: 'cctp'
  bridge: string
  bridgeIconURI: string
  durationMs: number
  amountReceived: string
  gasCost?: any
  bridgeFee?: any
}

export interface LifiRouteData {
  type: 'lifi-fastest' | 'lifi-cheapest' | 'lifi'
  route: LifiCrosschainTransfersRoute
  tag?: string
}

export interface ArbitrumRouteData {
  type: 'arbitrum'
  bridge: string
  bridgeIconURI: string
  durationMs: number
  amountReceived: string
  gasCost?: any
  bridgeFee?: any
}

export interface OftV2RouteData {
  type: 'oftV2'
  bridge: string
  bridgeIconURI: string
  durationMs: number
  amountReceived: string
  gasCost?: any
  bridgeFee?: any
}

export type RouteData =
  | CctpRouteData
  | LifiRouteData
  | ArbitrumRouteData
  | OftV2RouteData

// Centralized route state
export interface RouteStateData {
  eligibleRoutes: RouteType[]
  isLoading: boolean
  error?: string | null
  data: {
    cctp?: CctpRouteData
    lifi?: LifiRouteData[]
    arbitrum?: ArbitrumRouteData
    oftV2?: OftV2RouteData
  }
  flags: {
    hasLowLiquidity: boolean
  }
}

/** When route is in context, we didn't fetch transactionRequest yet and we only have information about the step */
export type RouteContext = LifiData &
  Omit<MergedTransactionLifiData, 'transactionRequest'> & { step: LiFiStep }

export type SetRoute = (route: RouteType, context?: RouteContext) => void

interface RouteState {
  // Current selected route (existing functionality)
  selectedRoute: RouteType | undefined
  context: RouteContext | undefined

  // New centralized route data
  routeState: RouteStateData

  // Actions
  setSelectedRoute: SetRoute
  clearRoute: () => void
  setRouteState: (state: RouteStateData) => void
  updateRouteData: (routeType: RouteType, data: any) => void
}

export const useRouteStore = create<RouteState>()(set => ({
  selectedRoute: undefined,
  context: undefined,
  routeState: {
    eligibleRoutes: [],
    isLoading: false,
    data: {},
    flags: {
      hasLowLiquidity: false
    }
  },

  setSelectedRoute: (route, context) =>
    set({
      selectedRoute: route,
      context
    }),

  clearRoute: () =>
    set({
      selectedRoute: undefined,
      context: undefined
    }),

  setRouteState: routeState => set({ routeState }),

  updateRouteData: (routeType, data) =>
    set(state => ({
      routeState: {
        ...state.routeState,
        data: {
          ...state.routeState.data,
          [routeType]: data
        }
      }
    }))
}))

export function isLifiRoute(selectedRoute: RouteType | undefined) {
  return (
    selectedRoute === 'lifi' ||
    selectedRoute === 'lifi-cheapest' ||
    selectedRoute === 'lifi-fastest'
  )
}

export function getContextFromRoute(
  route: LifiCrosschainTransfersRoute
): RouteContext {
  return {
    spenderAddress: route.spenderAddress as Address,
    gas: {
      amount: BigNumber.from(route.gas.amount),
      amountUSD: route.gas.amountUSD,
      token: route.gas.token
    },
    fee: {
      amount: BigNumber.from(route.fee.amount),
      amountUSD: route.fee.amountUSD,
      token: route.fee.token
    },
    fromAmount: {
      amount: BigNumber.from(route.fromAmount.amount),
      amountUSD: route.fromAmount.amountUSD,
      token: route.fromAmount.token
    },
    toAmount: {
      amount: BigNumber.from(route.toAmount.amount),
      amountUSD: route.toAmount.amountUSD,
      token: route.toAmount.token
    },
    toolDetails: route.protocolData.tool,
    durationMs: route.durationMs,
    destinationTxId: null,
    step: route.protocolData.step
  }
}

// Utility hook for components to access route data from the store
export function useRouteData() {
  return useRouteStore(state => state.routeState, shallow)
}
