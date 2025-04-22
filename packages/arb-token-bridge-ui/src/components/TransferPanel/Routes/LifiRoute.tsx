import { useNetworks } from '../../../hooks/useNetworks'
import { useNetworksRelationship } from '../../../hooks/useNetworksRelationship'
import { BigNumber, constants, utils } from 'ethers'
import { BadgeType, Route } from './Route'
import { useSelectedToken } from '../../../hooks/useSelectedToken'
import { RouteType, useRouteStore } from '../hooks/useRouteStore'
import { useArbQueryParams } from '../../../hooks/useArbQueryParams'
import {
  LifiCrosschainTransfersQuote,
  Order
} from '../../../pages/api/crosschain-transfers/lifi'
import {
  useLifiCrossTransfersQuote,
  UseLifiCrossTransfersQuoteParams
} from '../../../hooks/useLifiCrossTransferQuote'
import { Address, useAccount } from 'wagmi'
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

function areQuotesTheSame(
  quote1: LifiCrosschainTransfersQuote | undefined,
  quote2: LifiCrosschainTransfersQuote | undefined
) {
  if (!quote1 || !quote2) {
    return false
  }

  if (quote1.durationMs !== quote2.durationMs) {
    return false
  }
  if (quote1.protocolData.tool.key !== quote2.protocolData.tool.key) {
    return false
  }
  ;(
    ['value', 'to', 'data', 'from', 'chainId', 'gasPrice', 'gasLimit'] as const
  ).forEach(property => {
    if (
      quote1.protocolData.transactionRequest[property] !==
      quote2.protocolData.transactionRequest[property]
    ) {
      return false
    }
  })

  return true
}

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
  } satisfies Omit<UseLifiCrossTransfersQuoteParams, 'order'>

  const { data: cheapestQuote, isLoading: isLoadingCheapestQuote } =
    useLifiCrossTransfersQuote({
      ...parameters,
      order: Order.Cheapest
    })
  const { data: fastestQuote, isLoading: isLoadingFastestQuote } =
    useLifiCrossTransfersQuote({
      ...parameters,
      order: Order.Fastest
    })

  useEffect(() => {
    /**
     * Clear selected route when quotes change
     * This might be triggered even if routes seem to be the same because of gas fee or amount received
     */
    clearRoute()
  }, [
    cheapestQuote,
    fastestQuote,
    isLoadingCheapestQuote,
    isLoadingFastestQuote,
    clearRoute
  ])

  if (isLoadingCheapestQuote && isLoadingFastestQuote) {
    // If quotes are loading but we got previous quote, keep settings icon displayed
    if (cheapestQuote || fastestQuote) {
      return (
        <>
          <LifiSettings />
          <div className="flex items-center justify-center">
            <Loader color="white" size="small" />
          </div>
        </>
      )
    }

    return (
      <div className="flex items-center justify-center">
        <Loader color="white" size="small" />
      </div>
    )
  }

  if (
    !cheapestQuote &&
    !fastestQuote &&
    slippage !== defaultSlippage.toString()
  ) {
    return (
      <>
        <LifiSettings />
        <div className="rounded border border-lilac bg-lilac/50 p-3 text-sm text-white">
          Want more route options? Consider adjusting your slippage in Settings.
        </div>
      </>
    )
  }

  const quotesAreTheSame = areQuotesTheSame(cheapestQuote, fastestQuote)

  if (quotesAreTheSame) {
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
        <LifiRoute
          type="lifi"
          quote={cheapestQuote!}
          tag={tags}
          disabled={isDisabled}
        />
      </>
    )
  }

  return (
    <>
      <LifiSettings />
      {cheapestQuote && (
        <LifiRoute
          type="lifi-cheapest"
          quote={cheapestQuote}
          tag={cheapestTag}
          disabled={isDisabled}
        />
      )}
      {fastestQuote && (
        <LifiRoute
          type="lifi-fastest"
          quote={fastestQuote}
          tag={fastestTag}
          disabled={isDisabled}
        />
      )}
    </>
  )
}

function LifiRoute({
  type,
  quote,
  tag,
  disabled
}: {
  type: 'lifi' | 'lifi-fastest' | 'lifi-cheapest'
  quote: LifiCrosschainTransfersQuote
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
    (route: RouteType) => {
      setSelectedRoute(route, {
        spenderAddress: quote.spenderAddress as Address,
        gas: {
          amount: BigNumber.from(quote.gas.amount),
          token: quote.gas.token
        },
        fee: {
          amount: BigNumber.from(quote.fee.amount),
          token: quote.fee.token
        },
        fromAmount: {
          amount: BigNumber.from(quote.fromAmount.amount),
          token: quote.fromAmount.token
        },
        toAmount: {
          amount: BigNumber.from(quote.toAmount.amount),
          token: quote.toAmount.token
        },
        transactionRequest: quote.protocolData.transactionRequest,
        toolDetails: quote.protocolData.tool,
        durationMs: quote.durationMs,
        destinationTxId: null
      })
    },
    [
      setSelectedRoute,
      quote.spenderAddress,
      quote.gas.amount,
      quote.gas.token,
      quote.fee.amount,
      quote.fee.token,
      quote.fromAmount.amount,
      quote.fromAmount.token,
      quote.toAmount.amount,
      quote.toAmount.token,
      quote.protocolData.transactionRequest,
      quote.protocolData.tool,
      quote.durationMs
    ]
  )

  const bridgeFee = useMemo(
    () => ({
      fee: quote.fee.amount,
      token: quote.fee.token
    }),
    [quote.fee.amount, quote.fee.token]
  )

  const gasCost = useMemo(
    () => [
      {
        gasCost: quote.gas.amount,
        gasToken: quote.gas.token
      }
    ],
    [quote.gas.amount, quote.gas.token]
  )

  const isUsdcTransfer = isTokenNativeUSDC(selectedToken?.address)

  return (
    <Route
      type={type}
      bridge={quote.protocolData.tool.name}
      bridgeIconURI={quote.protocolData.tool.logoURI}
      durationMs={quote.durationMs}
      amountReceived={utils
        .formatUnits(quote.toAmount.amount, quote.toAmount.token.decimals)
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
