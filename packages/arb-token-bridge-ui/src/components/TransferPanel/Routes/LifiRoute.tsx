import { useNetworks } from '../../../hooks/useNetworks'
import { utils } from 'ethers'
import { BadgeType, Route } from './Route'
import {
  getContextFromRoute,
  RouteType,
  useRouteStore
} from '../hooks/useRouteStore'
import {
  LifiCrosschainTransfersRoute,
  Order
} from '../../../pages/api/crosschain-transfers/lifi'
import {
  defaultSlippage,
  useLifiSettingsStore
} from '../hooks/useLifiSettingsStore'
import { useCallback, useEffect, useMemo } from 'react'
import { useSelectedToken } from '../../../hooks/useSelectedToken'
import { shallow } from 'zustand/shallow'
import { getTokenOverride } from '../../../pages/api/crosschain-transfers/utils'
import { ERC20BridgeToken } from '../../../hooks/arbTokenBridge.types'

export function LifiRoutes() {
  const [networks] = useNetworks()
  const [selectedToken] = useSelectedToken()
  const { disabledBridges, disabledExchanges, slippage } = useLifiSettingsStore(
    state => ({
      disabledBridges: state.disabledBridges,
      disabledExchanges: state.disabledExchanges,
      slippage: state.slippage
    }),
    shallow
  )

  const clearRoute = useRouteStore(state => state.clearRoute)
  const selectedRoute = useRouteStore(state => state.selectedRoute)

  // Calculate token override for LiFi routes
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

  // Get LiFi routes and context from centralized store
  const lifiData = useRouteStore(state => state.routes.lifi)
  const eligibleRoutes = useRouteStore(state => state.eligibleRoutes)
  const lifiRoutes = lifiData?.map(lifiData => lifiData.route) || []

  // Clear route when LiFi data changes - only if selection was lifi route
  useEffect(() => {
    if (lifiRoutes.length > 0 && selectedRoute === 'lifi') {
      clearRoute()
    }
  }, [lifiRoutes, clearRoute])

  // Show no routes message if LiFi is eligible but no routes found
  if (lifiRoutes.length === 0) {
    if (
      slippage !== defaultSlippage.toString() ||
      disabledExchanges.length > 0 ||
      disabledBridges.length > 0
    ) {
      return (
        <div className="rounded border border-lilac bg-lilac/50 p-3 text-sm text-white">
          Want more route options? Consider adjusting your slippage in Settings.
        </div>
      )
    }

    return null
  }

  // Render LiFi routes based on centralized data
  const route = lifiRoutes[0]
  if (lifiRoutes.length === 1 && route) {
    // Determine tag for single LiFi route
    const getTag = (): BadgeType | undefined => {
      if (eligibleRoutes.includes('cctp')) {
        // LiFi + CCTP: CCTP = "Best Deal", LiFi = no tag
        return undefined
      } else if (eligibleRoutes.includes('arbitrum')) {
        // LiFi + Canonical: LiFi = "Best Deal"
        return 'best-deal'
      } else {
        // LiFi only: Show "best deal"
        return 'best-deal'
      }
    }

    const tags: BadgeType[] = []
    const tag = getTag()
    if (tag) {
      tags.push(tag)
    }

    return (
      <LifiRoute
        type="lifi"
        route={route}
        tag={tags}
        overrideToken={overrideToken.destination || undefined}
      />
    )
  }

  // Find cheapest and fastest routes
  const cheapestRoute = lifiRoutes.find(route =>
    route.protocolData.orders.includes(Order.Cheapest)
  )
  const fastestRoute = lifiRoutes.find(route =>
    route.protocolData.orders.includes(Order.Fastest)
  )

  // Determine tags for multiple LiFi routes
  const getCheapestTag = (): BadgeType | undefined => {
    if (eligibleRoutes.includes('cctp')) {
      // LiFi + CCTP: CCTP = "Best Deal", Cheapest LiFi = no tag
      return undefined
    } else if (eligibleRoutes.includes('arbitrum')) {
      // LiFi + Canonical: Cheapest LiFi = "Best Deal"
      return 'best-deal'
    } else {
      // LiFi only: Show "best deal"
      return 'best-deal'
    }
  }

  const getFastestTag = (): BadgeType => {
    // Fastest always gets "fastest" tag
    return 'fastest'
  }

  return (
    <>
      {cheapestRoute && (
        <LifiRoute
          type="lifi-cheapest"
          route={cheapestRoute}
          tag={getCheapestTag()}
          overrideToken={overrideToken.destination || undefined}
        />
      )}
      {fastestRoute && (
        <LifiRoute
          type="lifi-fastest"
          route={fastestRoute}
          tag={getFastestTag()}
          overrideToken={overrideToken.destination || undefined}
        />
      )}
    </>
  )
}

function LifiRoute({
  type,
  route,
  tag,
  overrideToken
}: {
  type: 'lifi' | 'lifi-fastest' | 'lifi-cheapest'
  route: LifiCrosschainTransfersRoute
  tag?: BadgeType | BadgeType[]
  overrideToken?: ERC20BridgeToken | undefined
}) {
  const { selectedRoute, setSelectedRoute } = useRouteStore(
    state => ({
      selectedRoute: state.selectedRoute,
      setSelectedRoute: state.setSelectedRoute
    }),
    shallow
  )
  const isSelected = selectedRoute === type

  const setSelectedRouteWithContext = useCallback(
    (routeType: RouteType) => {
      setSelectedRoute(routeType, getContextFromRoute(route))
    },
    [route, setSelectedRoute]
  )

  const bridgeFee = useMemo(
    () => ({
      fee: route.fee.amount,
      token: route.fee.token
    }),
    [route.fee.amount, route.fee.token]
  )

  const gasCost = useMemo(
    () => [
      {
        gasCost: route.gas.amount,
        gasToken: route.gas.token
      }
    ],
    [route.gas.amount, route.gas.token]
  )

  return (
    <Route
      type={type}
      bridge={route.protocolData.tool.name}
      bridgeIconURI={route.protocolData.tool.logoURI}
      durationMs={route.durationMs}
      amountReceived={utils
        .formatUnits(route.toAmount.amount, route.toAmount.token.decimals)
        .toString()}
      isLoadingGasEstimate={false}
      gasCost={gasCost}
      overrideToken={overrideToken}
      bridgeFee={bridgeFee}
      tag={tag}
      selected={isSelected}
      onSelectedRouteClick={setSelectedRouteWithContext}
    />
  )
}
