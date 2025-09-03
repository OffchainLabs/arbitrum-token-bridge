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
import { shallow } from 'zustand/shallow'
import { ERC20BridgeToken } from '../../../hooks/arbTokenBridge.types'

export function LifiRoutes() {
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

  // Get LiFi routes from centralized store
  const lifiData = useRouteStore(state => state.routes.lifi)
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
    // Get the tag from the centralized data
    const lifiRouteData = lifiData?.find(data => data.route === route)
    const tags: BadgeType[] = []
    if (lifiRouteData?.tag) {
      tags.push(lifiRouteData.tag)
    }
    return (
      <LifiRoute
        type="lifi"
        route={route}
        tag={tags}
        overrideToken={undefined}
      />
    )
  }

  // Find cheapest and fastest routes with their tags from centralized data
  const cheapestRouteData = lifiData?.find(
    data =>
      data.type === 'lifi-cheapest' &&
      data.route ===
        lifiRoutes.find(route =>
          route.protocolData.orders.includes(Order.Cheapest)
        )
  )
  const fastestRouteData = lifiData?.find(
    data =>
      data.type === 'lifi-fastest' &&
      data.route ===
        lifiRoutes.find(route =>
          route.protocolData.orders.includes(Order.Fastest)
        )
  )

  return (
    <>
      {cheapestRouteData && (
        <LifiRoute
          type="lifi-cheapest"
          route={cheapestRouteData.route}
          tag={cheapestRouteData.tag}
          overrideToken={undefined}
        />
      )}
      {fastestRouteData && (
        <LifiRoute
          type="lifi-fastest"
          route={fastestRouteData.route}
          tag={fastestRouteData.tag}
          overrideToken={undefined}
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
