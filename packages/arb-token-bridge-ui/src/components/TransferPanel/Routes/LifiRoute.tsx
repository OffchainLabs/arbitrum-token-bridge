import { useNetworks } from '../../../hooks/useNetworks'
import { useNetworksRelationship } from '../../../hooks/useNetworksRelationship'
import { BigNumber, constants, utils } from 'ethers'
import { BadgeType, Route } from './Route'
import { useSelectedToken } from '../../../hooks/useSelectedToken'
import { RouteType, useRouteStore } from '../hooks/useRouteStore'
import { useArbQueryParams } from '../../../hooks/useArbQueryParams'
import {
  LifiCrosschainTransfersRoute,
  Order
} from '../../../pages/api/crosschain-transfers/lifi'
import {
  useLifiCrossTransfersRoute,
  UseLifiCrossTransfersRouteParams
} from '../../../hooks/useLifiCrossTransferRoute'
import { useAccount } from 'wagmi'
import {
  defaultSlippage,
  useLifiSettingsStore
} from '../hooks/useLifiSettingsStore'
import { getFromAndToTokenAddresses, LifiSettings } from '../LifiSettings'
import { Loader } from '../../common/atoms/Loader'
import { useCallback, useEffect, useMemo } from 'react'
import { useAmountBigNumber } from '../hooks/useAmountBigNumber'
import { shallow } from 'zustand/shallow'
import { ArbOneNativeUSDC } from '../../../util/L2NativeUtils'
import { isTokenNativeUSDC } from '../../../util/TokenUtils'
import { useAppContextState } from '../../App/AppContext'
import { Address } from 'viem'

export function LifiRoutes({
  cheapestTag,
  fastestTag
}: {
  cheapestTag?: BadgeType
  fastestTag?: BadgeType
}) {
  const {
    layout: { isTransferring: isDisabled }
  } = useAppContextState()
  const { address } = useAccount()
  const [networks] = useNetworks()
  const { isDepositMode } = useNetworksRelationship(networks)
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

  const { fromToken, toToken } = getFromAndToTokenAddresses({
    selectedToken,
    isDepositMode,
    sourceChainId: networks.sourceChain.id
  })
  const parameters = {
    fromAddress: address,
    fromAmount: amount.toString(),
    fromChainId: networks.sourceChain.id,
    fromToken: fromToken || constants.AddressZero,
    toAddress: (destinationAddress as Address) || address,
    toChainId: networks.destinationChain.id,
    toToken: toToken || constants.AddressZero,
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
      <>
        <LifiSettings />
        <div className="flex items-center justify-center">
          <Loader color="white" size="small" />
        </div>
      </>
    )
  }

  if (!routes) {
    if (
      slippage !== defaultSlippage.toString() ||
      disabledExchanges.length > 0 ||
      disabledBridges.length > 0
    ) {
      return (
        <>
          <LifiSettings />
          <div className="rounded border border-lilac bg-lilac/50 p-3 text-sm text-white">
            Want more route options? Consider adjusting your slippage in
            Settings.
          </div>
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
      <>
        <LifiSettings />
        <LifiRoute type="lifi" route={route} tag={tags} disabled={isDisabled} />
      </>
    )
  }

  return (
    <>
      <LifiSettings />
      {cheapestRoute && (
        <LifiRoute
          type="lifi-cheapest"
          route={cheapestRoute}
          tag={cheapestTag}
          disabled={isDisabled}
        />
      )}
      {fastestRoute && (
        <LifiRoute
          type="lifi-fastest"
          route={fastestRoute}
          tag={fastestTag}
          disabled={isDisabled}
        />
      )}
    </>
  )
}

function LifiRoute({
  type,
  route,
  tag,
  disabled
}: {
  type: 'lifi' | 'lifi-fastest' | 'lifi-cheapest'
  route: LifiCrosschainTransfersRoute
  tag?: BadgeType | BadgeType[]
  disabled: boolean
}) {
  const [selectedToken] = useSelectedToken()
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
      setSelectedRoute(routeType, {
        spenderAddress: route.spenderAddress as Address,
        gas: {
          amount: BigNumber.from(route.gas.amount),
          token: route.gas.token
        },
        fee: {
          amount: BigNumber.from(route.fee.amount),
          token: route.fee.token
        },
        fromAmount: {
          amount: BigNumber.from(route.fromAmount.amount),
          token: route.fromAmount.token
        },
        toAmount: {
          amount: BigNumber.from(route.toAmount.amount),
          token: route.toAmount.token
        },
        toolDetails: route.protocolData.tool,
        durationMs: route.durationMs,
        destinationTxId: null,
        step: route.protocolData.step
      })
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

  const isUsdcTransfer = isTokenNativeUSDC(selectedToken?.address)

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
      overrideToken={isUsdcTransfer ? ArbOneNativeUSDC : undefined}
      bridgeFee={bridgeFee}
      tag={tag}
      selected={isSelected}
      onSelectedRouteClick={setSelectedRouteWithContext}
      disabled={disabled}
    />
  )
}
