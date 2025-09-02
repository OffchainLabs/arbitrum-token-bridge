import { LifiData } from '@/token-bridge-sdk/LifiTransferStarter'
import { create } from 'zustand'
import { MergedTransactionLifiData } from '../../../state/app/state'
import { LiFiStep } from '@lifi/sdk'
import { Address } from 'viem'
import { LifiCrosschainTransfersRoute } from '../../../pages/api/crosschain-transfers/lifi'
import { BigNumber } from 'ethers'
import { shallow } from 'zustand/shallow'
import { useNetworks } from '../../../hooks/useNetworks'
import { useNetworksRelationship } from '../../../hooks/useNetworksRelationship'
import { useIsCctpTransfer } from '../hooks/useIsCctpTransfer'
import { useIsOftV2Transfer } from '../hooks/useIsOftV2Transfer'
import { useIsArbitrumCanonicalTransfer } from '../hooks/useIsCanonicalTransfer'
import { useSelectedToken } from '../../../hooks/useSelectedToken'
import { useArbQueryParams } from '../../../hooks/useArbQueryParams'
import { useLifiCrossTransfersRoute } from '../../../hooks/useLifiCrossTransferRoute'
import { useAccount } from 'wagmi'
import { constants } from 'ethers'
import { getTokenOverride } from '../../../pages/api/crosschain-transfers/utils'
import { useAmountBigNumber } from '../hooks/useAmountBigNumber'
import { useLifiSettingsStore } from '../hooks/useLifiSettingsStore'
import { isNetwork } from '../../../util/networks'
import { isLifiEnabled as isLifiEnabledUtil } from '../../../util/featureFlag'
import { isValidLifiTransfer } from '../../../pages/api/crosschain-transfers/utils'
import { ERC20BridgeToken } from '../../../hooks/arbTokenBridge.types'
import { useMemo, useEffect } from 'react'

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

// Helper function to determine eligible routes (sync)
function getEligibleRoutes({
  isOftV2Transfer,
  isCctpTransfer,
  amount,
  isDepositMode,
  isTestnet,
  sourceChainId,
  destinationChainId,
  selectedToken,
  isArbitrumCanonicalTransfer
}: {
  isOftV2Transfer: boolean
  isCctpTransfer: boolean
  amount: string
  isDepositMode: boolean
  isTestnet: boolean
  sourceChainId: number
  destinationChainId: number
  selectedToken: ERC20BridgeToken | null
  isArbitrumCanonicalTransfer: boolean
}): RouteType[] {
  const isLifiEnabled = isLifiEnabledUtil() && !isTestnet
  const eligibleRoutes: RouteType[] = []

  if (Number(amount) === 0) {
    return []
  }

  if (isOftV2Transfer) {
    eligibleRoutes.push('oftV2')
    return eligibleRoutes
  }

  if (isCctpTransfer) {
    eligibleRoutes.push('cctp')

    if (isLifiEnabled) {
      eligibleRoutes.push('lifi')
    }

    if (isDepositMode) {
      eligibleRoutes.push('arbitrum')
    }

    return eligibleRoutes
  }

  const isValidLifiRoute =
    isLifiEnabled &&
    isValidLifiTransfer({
      fromToken: isDepositMode
        ? selectedToken?.address
        : selectedToken?.l2Address,
      sourceChainId: sourceChainId,
      destinationChainId: destinationChainId
    })

  if (isValidLifiRoute) {
    eligibleRoutes.push('lifi')
  }

  if (isArbitrumCanonicalTransfer) {
    eligibleRoutes.push('arbitrum')
  }

  return eligibleRoutes
}

// Hook that updates the store when inputs change
export function useRouteManagementUpdater() {
  const [networks] = useNetworks()
  const { isDepositMode } = useNetworksRelationship(networks)
  const [{ amount }] = useArbQueryParams()
  const isCctpTransfer = useIsCctpTransfer()
  const isOftV2Transfer = useIsOftV2Transfer()
  const [selectedToken] = useSelectedToken()
  const { address } = useAccount()
  const [{ destinationAddress }] = useArbQueryParams()
  const amountBN = useAmountBigNumber()
  const { disabledBridges, disabledExchanges, slippage } = useLifiSettingsStore(
    state => ({
      disabledBridges: state.disabledBridges,
      disabledExchanges: state.disabledExchanges,
      slippage: state.slippage
    }),
    shallow
  )

  const { isTestnet } = isNetwork(networks.sourceChain.id)
  const isArbitrumCanonicalTransfer = useIsArbitrumCanonicalTransfer()
  const setRouteState = useRouteStore(state => state.setRouteState)

  // Determine eligible routes
  const eligibleRoutes = useMemo(
    () =>
      getEligibleRoutes({
        isOftV2Transfer,
        isCctpTransfer,
        amount,
        isDepositMode,
        isTestnet,
        sourceChainId: networks.sourceChain.id,
        destinationChainId: networks.destinationChain.id,
        selectedToken,
        isArbitrumCanonicalTransfer
      }),
    [
      isOftV2Transfer,
      isCctpTransfer,
      amount,
      isDepositMode,
      isTestnet,
      networks.sourceChain.id,
      networks.destinationChain.id,
      selectedToken,
      isArbitrumCanonicalTransfer
    ]
  )

  // Always call LiFi hook if LiFi is enabled (to avoid conditional hook calls)
  const overrideToken = useMemo(
    () =>
      getTokenOverride({
        sourceChainId: networks.sourceChain.id,
        fromToken: selectedToken?.address,
        destinationChainId: networks.destinationChain.id
      }),
    [
      selectedToken?.address,
      networks.sourceChain.id,
      networks.destinationChain.id
    ]
  )

  const lifiParameters = {
    fromAddress: address,
    fromAmount: amountBN.toString(),
    fromChainId: networks.sourceChain.id,
    fromToken: overrideToken.source?.address || constants.AddressZero,
    toAddress: (destinationAddress as Address) || address,
    toChainId: networks.destinationChain.id,
    toToken: overrideToken.destination?.address || constants.AddressZero,
    denyBridges: disabledBridges,
    denyExchanges: disabledExchanges,
    slippage
  }

  const {
    data: lifiRoutes,
    isLoading: isLifiLoading,
    error: lifiError
  } = useLifiCrossTransfersRoute(lifiParameters)

  // Determine if there's an overall error
  const hasError = lifiError && eligibleRoutes.includes('lifi')

  // Construct route data
  const routeData = useMemo(() => {
    const data: RouteStateData['data'] = {}

    // OFT V2 route data
    if (eligibleRoutes.includes('oftV2')) {
      data.oftV2 = {
        type: 'oftV2',
        bridge: 'LayerZero',
        bridgeIconURI: '/icons/layerzero.svg',
        durationMs: 5 * 60 * 1_000, // 5 minutes
        amountReceived: amount.toString()
      }
    }

    // CCTP route data
    if (eligibleRoutes.includes('cctp')) {
      data.cctp = {
        type: 'cctp',
        bridge: 'Circle CCTP',
        bridgeIconURI: '/icons/cctp.svg',
        durationMs: 1 * 60 * 1_000, // 1 minute
        amountReceived: amount.toString()
      }
    }

    // LiFi route data
    if (eligibleRoutes.includes('lifi') && lifiRoutes) {
      const cheapestRoute = lifiRoutes.find(route =>
        route.protocolData.orders.includes('CHEAPEST' as any)
      )
      const fastestRoute = lifiRoutes.find(route =>
        route.protocolData.orders.includes('FASTEST' as any)
      )

      const lifiData: LifiRouteData[] = []

      if (cheapestRoute) {
        lifiData.push({
          type: 'lifi-cheapest',
          route: cheapestRoute,
          tag: 'best-deal'
        })
      }

      if (fastestRoute) {
        lifiData.push({
          type: 'lifi-fastest',
          route: fastestRoute,
          tag: 'fastest'
        })
      }

      if (lifiData.length === 1 && lifiData[0]) {
        lifiData[0].type = 'lifi'
      }

      data.lifi = lifiData
    }

    // Arbitrum canonical route data
    if (eligibleRoutes.includes('arbitrum')) {
      data.arbitrum = {
        type: 'arbitrum',
        bridge: 'Arbitrum Bridge',
        bridgeIconURI: '/icons/arbitrum.svg',
        durationMs: (isTestnet ? 1 : 7) * 24 * 60 * 60 * 1_000, // 1 day testnet, 7 days mainnet
        amountReceived: amount.toString()
      }
    }

    return data
  }, [eligibleRoutes, lifiRoutes, amount, isTestnet])

  // Determine flags
  const flags = useMemo(
    () => ({
      hasLowLiquidity:
        eligibleRoutes.includes('lifi') && !lifiRoutes && !isLifiLoading
    }),
    [eligibleRoutes, lifiRoutes, isLifiLoading]
  )

  // Update store when data changes
  useEffect(() => {
    console.log('xxxxxx', {
      eligibleRoutes,
      isLifiLoading,
      hasError,
      routeData,
      flags
    })

    setRouteState({
      eligibleRoutes,
      isLoading: isLifiLoading,
      error: hasError
        ? lifiError?.message || 'Failed to load LiFi routes'
        : null,
      data: routeData,
      flags
    })
  }, [
    eligibleRoutes,
    isLifiLoading,
    hasError,
    lifiError?.message,
    routeData,
    flags,
    setRouteState
  ])
}
