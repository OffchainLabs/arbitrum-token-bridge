import { useMemo, useEffect } from 'react'
import { useNetworks } from '../../../hooks/useNetworks'
import { useNetworksRelationship } from '../../../hooks/useNetworksRelationship'
import { useArbQueryParams } from '../../../hooks/useArbQueryParams'
import { useIsCctpTransfer } from '../hooks/useIsCctpTransfer'
import { useIsOftV2Transfer } from '../hooks/useIsOftV2Transfer'
import { useIsArbitrumCanonicalTransfer } from '../hooks/useIsCanonicalTransfer'
import { useSelectedToken } from '../../../hooks/useSelectedToken'
import { useAccount } from 'wagmi'
import { constants } from 'ethers'
import { getTokenOverride } from '../../../pages/api/crosschain-transfers/utils'
import { useAmountBigNumber } from '../hooks/useAmountBigNumber'
import { useLifiSettingsStore } from '../hooks/useLifiSettingsStore'
import { isNetwork } from '../../../util/networks'
import { isLifiEnabled as isLifiEnabledUtil } from '../../../util/featureFlag'
import { isValidLifiTransfer } from '../../../pages/api/crosschain-transfers/utils'
import { ERC20BridgeToken } from '../../../hooks/arbTokenBridge.types'
import {
  useRouteStore,
  RouteType,
  CctpRouteData,
  LifiRouteData,
  ArbitrumRouteData,
  OftV2RouteData
} from './useRouteStore'
import { shallow } from 'zustand/shallow'
import { useLifiCrossTransfersRoute } from '../../../hooks/useLifiCrossTransferRoute'
import { Address } from 'viem'

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
export function useRoutesUpdater() {
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
    slippage,
    enabled: eligibleRoutes.includes('lifi')
  }

  const {
    data: lifiRoutes,
    isLoading: isLifiLoading,
    error: lifiError
  } = useLifiCrossTransfersRoute(lifiParameters)

  // Construct route data with advanced tagging logic
  // Tagging scenarios:
  // 1. LiFi + CCTP: CCTP = "Best Deal", Cheapest LiFi = no tag, Fastest LiFi = "Fastest"
  // 2. LiFi + Canonical: Cheapest LiFi = "Best Deal", Fastest LiFi = "Fastest", Canonical = "Security guaranteed by Arbitrum"
  // 3. CCTP + Canonical: CCTP = "Best Deal", Canonical = "Security guaranteed by Arbitrum"
  // 4. Canonical only: "Security guaranteed by Arbitrum"
  // 5. LiFi only: Cheapest = "Best Deal", Fastest = "Fastest"
  // 6. OFT V2 only: No tags (only 1 option)
  const routeData = useMemo(() => {
    const data: {
      oftV2?: OftV2RouteData
      cctp?: CctpRouteData
      lifi?: LifiRouteData[]
      arbitrum?: ArbitrumRouteData
    } = {}

    // OFT V2 route data
    if (eligibleRoutes.includes('oftV2')) {
      data.oftV2 = {
        type: 'oftV2',
        bridge: 'LayerZero',
        bridgeIconURI: '/icons/layerzero.svg',
        amountReceived: amount.toString(),
        // No tags when OFT V2 is the only route (as per requirements)
        tag: undefined
      }
    }

    // CCTP route data
    if (eligibleRoutes.includes('cctp')) {
      data.cctp = {
        type: 'cctp',
        bridge: 'Circle CCTP',
        bridgeIconURI: '/icons/cctp.svg',
        amountReceived: amount.toString(),
        // Tag as "Best Deal" when shown with LiFi routes OR when shown with Canonical
        // This covers: LiFi + CCTP, CCTP + Canonical scenarios
        tag:
          eligibleRoutes.includes('lifi') || eligibleRoutes.includes('arbitrum')
            ? 'best-deal'
            : undefined
      }
    }

    // LiFi route data with sophisticated tagging logic
    if (eligibleRoutes.includes('lifi') && lifiRoutes) {
      const cheapestRoute = lifiRoutes.find(route =>
        route.protocolData.orders.includes('CHEAPEST' as any)
      )
      const fastestRoute = lifiRoutes.find(route =>
        route.protocolData.orders.includes('FASTEST' as any)
      )

      const lifiData: LifiRouteData[] = []

      // Determine tags based on route combination
      if (eligibleRoutes.includes('cctp')) {
        // LiFi + CCTP: CCTP = "Best Deal", Cheapest LiFi = no tag, Fastest LiFi = "Fastest"
        if (cheapestRoute) {
          lifiData.push({
            type: 'lifi-cheapest',
            route: cheapestRoute,
            tag: undefined // No tag for cheapest when CCTP is present
          })
        }
        if (fastestRoute) {
          lifiData.push({
            type: 'lifi-fastest',
            route: fastestRoute,
            tag: 'fastest'
          })
        }
      } else if (eligibleRoutes.includes('arbitrum')) {
        // LiFi + Canonical: Cheapest LiFi = "Best Deal", Fastest LiFi = "Fastest"
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
      } else {
        // LiFi only: Show "fastest" and "best return" routes with tags
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
      }

      // If only one LiFi route, simplify the type
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
        amountReceived: amount.toString(),
        // Tag as "Security guaranteed by Arbitrum" - always shown for security
        tag: 'security-guaranteed'
      }
    }

    return data
  }, [eligibleRoutes, lifiRoutes, amount, isTestnet])

  // Determine flags
  const flags = useMemo(
    () => ({
      hasLowLiquidity:
        // Only true if:
        // 1. LiFi is the ONLY eligible route
        // 2. LiFi fetcher response was successful (no error)
        // 3. LiFi response contains no routes
        eligibleRoutes.includes('lifi') &&
        eligibleRoutes.length === 1 &&
        !lifiError &&
        !isLifiLoading &&
        (!lifiRoutes || lifiRoutes.length === 0)
    }),
    [eligibleRoutes, lifiError, isLifiLoading, lifiRoutes]
  )

  // Only show error if ALL routes fail (LiFi is the only route and it failed)
  const hasError =
    lifiError && eligibleRoutes.includes('lifi') && eligibleRoutes.length === 1

  // Update store when data changes
  useEffect(() => {
    setRouteState({
      eligibleRoutes,
      isLoading: isLifiLoading,
      error: hasError
        ? `Routes failed to load: ${lifiError?.message || 'Unknown error'}`
        : null,

      routes: routeData,
      hasLowLiquidity: flags.hasLowLiquidity
    })
  }, [
    eligibleRoutes,
    isLifiLoading,
    hasError,
    lifiError,
    routeData,
    flags,
    setRouteState
  ])
}
