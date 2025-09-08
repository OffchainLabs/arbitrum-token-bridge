import { BadgeType, Route } from './Route'
import {
  getContextFromRoute,
  RouteType,
  useRouteStore
} from '../hooks/useRouteStore'
import { LifiCrosschainTransfersRoute } from '../../../app/api/crosschain-transfers/lifi'
import { useCallback, useMemo } from 'react'
import { shallow } from 'zustand/shallow'
import { ERC20BridgeToken } from '../../../hooks/arbTokenBridge.types'
import { utils } from 'ethers'

// Simplified LifiRoute component that handles only one route
export function LifiRoute({
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
      amountReceived={utils.formatUnits(
        route.toAmount.amount,
        route.toAmount.token.decimals
      )}
      overrideToken={overrideToken}
      isLoadingGasEstimate={false}
      gasCost={gasCost}
      bridgeFee={bridgeFee}
      selected={isSelected}
      onSelectedRouteClick={setSelectedRouteWithContext}
      tag={tag}
    />
  )
}
