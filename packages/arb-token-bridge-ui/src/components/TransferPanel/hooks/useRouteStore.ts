import { LifiData } from '@/token-bridge-sdk/LifiTransferStarter'
import { create } from 'zustand'
import { MergedTransactionLifiData } from '../../../state/app/state'
import { LiFiStep } from '@lifi/sdk'
import { Address } from 'viem'
import { LifiCrosschainTransfersRoute } from '@/bridge/app/api/crosschain-transfers/lifi'
import { BigNumber } from 'ethers'
import {
  RouteGas,
  BridgeFee
} from '../../../app/api/crosschain-transfers/types'

export type RouteType =
  | 'arbitrum'
  | 'oftV2'
  | 'cctp'
  | 'lifi-fastest'
  | 'lifi-cheapest'
  | 'lifi' // If fastest and cheapest quotes are the same

export type RouteData =
  | {
      type: 'cctp'
      data: {
        amountReceived: string
        gasCost?: RouteGas[]
        bridgeFee?: BridgeFee
      }
    }
  | {
      type: 'lifi' | 'lifi-fastest' | 'lifi-cheapest'
      data: {
        route: LifiCrosschainTransfersRoute
      }
    }
  | {
      type: 'arbitrum'
      data: {
        amountReceived: string
        gasCost?: RouteGas[]
        bridgeFee?: BridgeFee
      }
    }
  | {
      type: 'oftV2'
      data: {
        amountReceived: string
        gasCost?: RouteGas[]
        bridgeFee?: BridgeFee
      }
    }

/** When route is in context, we didn't fetch transactionRequest yet and we only have information about the step */
export type RouteContext = LifiData &
  Omit<MergedTransactionLifiData, 'transactionRequest'> & { step: LiFiStep }

export type SetRoute = (route: RouteType, context?: RouteContext) => void

export type RouteStateUpdate = {
  selectedRoute: RouteType | undefined
  eligibleRouteTypes: RouteType[]
  isLoading: boolean
  error?: string | null
  routes: RouteData[]
  hasLowLiquidity: boolean
  hasModifiedSettings: boolean
}

interface RouteState {
  selectedRoute: RouteType | undefined // the route that is currently selected - can be default or user-selected
  userSelectedRoute: RouteType | undefined // subset of `selectedRoute` - filled only if user has clicked and selected a route
  context: RouteContext | undefined // selected route's context (details)

  eligibleRouteTypes: RouteType[]
  isLoading: boolean
  error?: string | null

  routes: RouteData[]

  hasLowLiquidity: boolean
  hasModifiedSettings: boolean

  setSelectedRoute: SetRoute
  clearRoute: () => void
  setRouteState: (state: Partial<RouteStateUpdate>) => void
}

export const useRouteStore = create<RouteState>()(set => ({
  selectedRoute: undefined,
  userSelectedRoute: undefined,
  context: undefined,
  eligibleRouteTypes: [],
  isLoading: false,
  routes: [],
  hasLowLiquidity: false,
  hasModifiedSettings: false,

  setSelectedRoute: (route, context) =>
    set({
      selectedRoute: route,
      userSelectedRoute: route, // Mark as user-selected to preserve across route refreshes
      context
    }),

  clearRoute: () =>
    set({
      selectedRoute: undefined,
      userSelectedRoute: undefined,
      context: undefined
    }),

  setRouteState: updates => set(updates)
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
