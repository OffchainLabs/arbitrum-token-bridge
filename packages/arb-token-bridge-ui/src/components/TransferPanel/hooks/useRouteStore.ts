import { LifiData } from '@/token-bridge-sdk/LifiTransferStarter'
import { create } from 'zustand'
import { MergedTransactionLifiData } from '../../../state/app/state'
import { LiFiStep } from '@lifi/sdk'
import { Address } from 'viem'
import { LifiCrosschainTransfersRoute } from '@/bridge/app/api/crosschain-transfers/lifi'
import { BigNumber } from 'ethers'

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
