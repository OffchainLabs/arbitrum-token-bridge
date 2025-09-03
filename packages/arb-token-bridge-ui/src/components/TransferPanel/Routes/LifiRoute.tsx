import { useNetworks } from '../../../hooks/useNetworks'
import { constants, utils } from 'ethers'
import { BadgeType, Route } from './Route'
import { useSelectedToken } from '../../../hooks/useSelectedToken'
import {
  getContextFromRoute,
  RouteType,
  useRouteStore
} from '../hooks/useRouteStore'
import { useArbQueryParams } from '../../../hooks/useArbQueryParams'
import {
  LifiCrosschainTransfersRoute,
  Order
} from '../../../app/api/crosschain-transfers/lifi'
import {
  useLifiCrossTransfersRoute,
  UseLifiCrossTransfersRouteParams
} from '../../../hooks/useLifiCrossTransferRoute'
import { useAccount } from 'wagmi'
import {
  defaultSlippage,
  useLifiSettingsStore
} from '../hooks/useLifiSettingsStore'
import { Loader } from '../../common/atoms/Loader'
import { useCallback, useEffect, useMemo } from 'react'
import { useAmountBigNumber } from '../hooks/useAmountBigNumber'
import { shallow } from 'zustand/shallow'
import { Address } from 'viem'
import { getTokenOverride } from '../../../app/api/crosschain-transfers/utils'
import { ERC20BridgeToken } from '../../../hooks/arbTokenBridge.types'
import { useRoutes } from './Routes'
import { NoteBox } from '../../common/NoteBox'

export function LifiRoutes({
  cheapestTag,
  fastestTag
}: {
  cheapestTag?: BadgeType
  fastestTag?: BadgeType
}) {
  const { ChildRoutes } = useRoutes()
  const { address } = useAccount()
  const [networks] = useNetworks()
  const { disabledBridges, disabledExchanges, slippage } = useLifiSettingsStore(
    state => ({
      disabledBridges: state.disabledBridges,
      disabledExchanges: state.disabledExchanges,
      slippage: state.slippage
    }),
    shallow
  )

  const clearRoute = useRouteStore(state => state.clearRoute)
  const [{ destinationAddress }] = useArbQueryParams()
  const [selectedToken] = useSelectedToken()
  const amount = useAmountBigNumber()

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

  const parameters = {
    fromAddress: address,
    fromAmount: amount.toString(),
    fromChainId: networks.sourceChain.id,
    fromToken: overrideToken.source?.address || constants.AddressZero,
    toAddress: (destinationAddress as Address) || address,
    toChainId: networks.destinationChain.id,
    toToken: overrideToken.destination?.address || constants.AddressZero,
    denyBridges: disabledBridges,
    denyExchanges: disabledExchanges,
    slippage
  } satisfies Omit<UseLifiCrossTransfersRouteParams, 'order'>

  const { data: routes, isLoading: isLoading } =
    useLifiCrossTransfersRoute(parameters)

  useEffect(() => {
    /**
     * Clear selected route when routes change
     * This might be triggered even if routes seem to be the same because of gas fee or amount received
     */
    clearRoute()
  }, [isLoading, routes, clearRoute])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center">
        <Loader color="white" size="small" />
      </div>
    )
  }

  if (!routes) {
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

    // If lifi is the only route available, show an empty state
    if (ChildRoutes?.props.children.length === 1) {
      return (
        <>
          <NoteBox variant="warning" className="w-fit">
            Low liquidity
          </NoteBox>

          <p className="flex flex-col text-sm text-white">
            Unable to find a viable path because of low liquidity.
            <br /> <br />
            This can happen when demand for a specific asset is high or if a new
            chain has limited initial liquidity.
            <br /> <br />
            You can try to:
            <ol className="list-decimal pl-6">
              <li>Check back soon: Liquidity conditions can improve.</li>
              <li>Reduce your transaction amount.</li>
              <li>If possible, consider alternative assets or destinations.</li>
            </ol>
          </p>
        </>
      )
    }

    return null
  }

  const cheapestRoute = routes.find(route =>
    route.protocolData.orders.find(order => order === Order.Cheapest)
  )
  const fastestRoute = routes.find(route =>
    route.protocolData.orders.find(order => order === Order.Fastest)
  )

  const route = routes[0]
  if (routes.length === 1 && route) {
    const tags: BadgeType[] = []
    if (fastestTag) {
      tags.push(fastestTag)
    }
    if (cheapestTag) {
      tags.push(cheapestTag)
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

  return (
    <>
      {cheapestRoute && (
        <LifiRoute
          type="lifi-cheapest"
          route={cheapestRoute}
          tag={cheapestTag}
          overrideToken={overrideToken.destination || undefined}
        />
      )}
      {fastestRoute && (
        <LifiRoute
          type="lifi-fastest"
          route={fastestRoute}
          tag={fastestTag}
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
