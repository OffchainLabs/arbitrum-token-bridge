import { NextApiRequest, NextApiResponse } from 'next'
import {
  createConfig,
  TransactionRequest as LiFiTransactionRequest,
  GasCost,
  FeeCost,
  StepToolDetails,
  getRoutes,
  RoutesRequest,
  Route,
  LiFiStep
} from '@lifi/sdk'
import { BigNumber, constants, utils } from 'ethers'
import { CrosschainTransfersRouteBase, QueryParams } from './types'
import { CommonAddress } from '../../../util/CommonAddressUtils'

export enum Order {
  /**
   * This sorting option prioritises routes with the highest estimated return amount.
   * Users who value capital efficiency at the expense of speed and route complexity should choose the cheapest routes.
   */
  Cheapest = 'CHEAPEST',
  /**
   * This sorting option prioritizes routes with the shortest estimated execution time.
   * Users who value speed and want their transactions to be completed as quickly as possible should choose the fastest routes
   */
  Fastest = 'FASTEST'
}

export type TransactionRequest = Required<
  Pick<
    LiFiTransactionRequest,
    'value' | 'to' | 'data' | 'from' | 'chainId' | 'gasPrice' | 'gasLimit'
  >
>

type Tags = Order[]
export interface LifiCrosschainTransfersRoute
  extends CrosschainTransfersRouteBase {
  type: 'lifi'
  protocolData: {
    orders: Tags
    tool: StepToolDetails
    /** This is needed to fetch transactionRequest later on */
    step: LiFiStep
  }
}

function sumGasCosts(gasCosts: GasCost[] | undefined) {
  return (
    (gasCosts || []).reduce((sum, gas) => {
      return sum.add(BigNumber.from(gas.estimate))
    }, constants.Zero) ?? constants.Zero
  ).toString()
}
function sumFee(feeCosts: FeeCost[] | undefined) {
  return (
    (feeCosts || []).reduce((sum, fee) => {
      return sum.add(BigNumber.from(fee.amount))
    }, constants.Zero) ?? constants.Zero
  ).toString()
}

function parseLifiRouteToCrosschainTransfersQuoteWithLifiData({
  route,
  fromAddress,
  toAddress,
  fromChainId,
  toChainId
}: {
  route: Route
  fromAddress?: string
  toAddress: string
  fromChainId: string
  toChainId: string
  fromToken: string
  toToken: string
}): LifiCrosschainTransfersRoute {
  const step = route.steps[0]!
  const tags: Order[] = []
  if (route.tags && route.tags.includes(Order.Cheapest)) {
    tags.push(Order.Cheapest)
  }
  if (route.tags && route.tags.includes(Order.Fastest)) {
    tags.push(Order.Fastest)
  }
  return {
    type: 'lifi',
    durationMs: step.estimate.executionDuration * 1_000,
    gas: {
      /** Amount with all decimals (e.g. 100000000000000 for 0.0001 ETH) */
      amount: sumGasCosts(step.estimate.gasCosts),
      token: step.estimate.gasCosts![0]!.token
    },
    fee: {
      /** Amount with all decimals (e.g. 100000000000000 for 0.0001 ETH) */
      amount: sumFee(step.estimate.feeCosts),
      token: step.estimate.feeCosts![0]!.token
    },
    fromAmount: {
      /** Amount with all decimals (e.g. 100000000000000 for 0.0001 ETH) */
      amount: step.action.fromAmount,
      token: step.action.fromToken
    },
    toAmount: {
      /** Amount with all decimals (e.g. 100000000000000 for 0.0001 ETH) */
      amount: step.estimate.toAmount,
      token: step.action.toToken
    },
    fromAddress,
    toAddress,
    fromChainId: Number(fromChainId),
    toChainId: Number(toChainId),
    spenderAddress: step.estimate.approvalAddress,
    protocolData: {
      step,
      tool: step.toolDetails,
      orders: tags
    }
  }
}

function findCheapestRoute(
  routes: LifiCrosschainTransfersRoute[]
): LifiCrosschainTransfersRoute {
  const cheapestRoute = routes.reduce((currentMin, route) => {
    if (!currentMin) {
      return route
    }

    if (
      BigNumber.from(route.toAmount.amount).lt(
        BigNumber.from(currentMin.toAmount.amount)
      )
    ) {
      return route
    }
    return currentMin
  }, routes[0])

  if (!cheapestRoute) {
    throw new Error('No cheapest route found')
  }

  return cheapestRoute
}

function findFastestRoute(
  routes: LifiCrosschainTransfersRoute[]
): LifiCrosschainTransfersRoute {
  const fastestRoute = routes.reduce((currentMin, route) => {
    if (!currentMin) {
      return route
    }

    if (
      BigNumber.from(route.durationMs).lt(BigNumber.from(currentMin.durationMs))
    ) {
      return route
    }
    return currentMin
  }, routes[0])

  if (!fastestRoute) {
    throw new Error('No fastest route found')
  }

  return fastestRoute
}

const INTEGRATOR_ID = 'arbitrum'

createConfig({
  integrator: INTEGRATOR_ID,
  apiKey: process.env.NEXT_PUBLIC_LIFI_KEY
})

type LifiCrossTransfersRoutesResponse =
  | {
      message: string
      data: null
    }
  | {
      data: LifiCrosschainTransfersRoute[]
    }

export type LifiParams = QueryParams & {
  slippage?: string
  denyBridges?: string | string[]
  denyExchanges?: string | string[]
}

/** Extending the standard NextJs request with fast bridge transfer params */
export type NextApiRequestWithLifiParams = NextApiRequest & {
  query: LifiParams
}
export default async function handler(
  req: NextApiRequestWithLifiParams,
  res: NextApiResponse<LifiCrossTransfersRoutesResponse>
) {
  const {
    fromToken,
    toToken,
    fromChainId,
    toChainId,
    fromAmount,
    fromAddress,
    toAddress,
    denyBridges,
    denyExchanges,
    slippage
  } = req.query

  try {
    // validate method
    if (req.method !== 'GET') {
      res
        .status(400)
        .send({ message: `invalid_method: ${req.method}`, data: null })
      return
    }

    // Validate parameters
    if (!toAddress || !utils.isAddress(toAddress)) {
      res
        .status(400)
        .send({ message: 'toAddress is not a valid address', data: null })
      return
    }

    if (!fromToken || !utils.isAddress(fromToken)) {
      res
        .status(400)
        .send({ message: 'fromToken is not a valid address', data: null })
      return
    }

    const allowedSourceTokens = [
      CommonAddress.ArbitrumOne.USDC,
      constants.AddressZero
    ]
    if (!allowedSourceTokens.includes(fromToken)) {
      res.status(400).send({
        message: 'fromToken is not one of the allowed tokens: USDC, ETH',
        data: null
      })
      return
    }

    if (!toToken || !utils.isAddress(toToken)) {
      res
        .status(400)
        .send({ message: 'toToken is not a valid address', data: null })
      return
    }

    const allowedDestinationToken = [
      CommonAddress.Ethereum.USDC,
      constants.AddressZero
    ]
    if (!allowedDestinationToken.includes(toToken)) {
      res.status(400).send({
        message: 'toToken is not one of the allowed tokens: USDC, ETH',
        data: null
      })
      return
    }

    // Validate options
    const parsedSlippage = Number(slippage)
    if (
      (slippage && Number.isNaN(parsedSlippage)) ||
      parsedSlippage <= 0 ||
      parsedSlippage > 100
    ) {
      res.status(400).send({
        message: `Slippage is invalid`,
        data: null
      })
      return
    }

    let bridgesToExclude: string[] = []
    if (denyBridges) {
      if (typeof denyBridges === 'string') {
        bridgesToExclude.push(denyBridges)
      } else {
        bridgesToExclude = denyBridges
      }
    }

    let exchangesToExclude: string[] = []
    if (denyExchanges) {
      if (typeof denyExchanges === 'string') {
        exchangesToExclude.push(denyExchanges)
      } else {
        exchangesToExclude = denyExchanges
      }
    }

    const parameters: RoutesRequest = {
      fromAddress,
      fromAmount,
      fromTokenAddress: fromToken,
      fromChainId: Number(fromChainId),
      toChainId: Number(toChainId),
      toTokenAddress: toToken,
      toAddress
    }

    const options: RoutesRequest['options'] = {
      integrator: INTEGRATOR_ID,
      allowSwitchChain: false,
      allowDestinationCall: false
    }

    if (slippage) {
      options.slippage = parsedSlippage / 100
    }

    if (bridgesToExclude && bridgesToExclude.length > 0) {
      options.bridges = {
        deny: bridgesToExclude
      }
    }
    if (exchangesToExclude && exchangesToExclude.length > 0) {
      options.exchanges = {
        deny: exchangesToExclude
      }
    }

    const { routes } = await getRoutes({ ...parameters, options })

    const filteredRoutes = routes
      .filter(route => route.steps.length === 1)
      .map(route =>
        parseLifiRouteToCrosschainTransfersQuoteWithLifiData({
          route,
          fromAddress,
          toAddress,
          fromChainId,
          toChainId,
          fromToken,
          toToken
        })
      )

    /**
     * We only care about the fastest and the cheapest route
     * The fastest and the cheapest route might be the same
     *
     * We filter any route with more than 1 step, those filtered out route might be the fastest and/or the cheapest
     * If we filtered one of those route, we manually compute it
     *
     * We filter all route with more than 1 step.
     * If we filtered the fastest and/or cheapest route, we manually compute and
     */
    const tags = filteredRoutes.reduce((acc, route) => {
      return acc.concat(route.protocolData.orders)
    }, [] as Order[])

    // We didn't filter route with tags
    if (tags.length === 2) {
      res.status(200).json({
        data: filteredRoutes.filter(
          route => route.protocolData.orders.length > 0
        )
      })
      return
    }

    const cheapestRoute = findCheapestRoute(filteredRoutes)
    const fastestRoute = findFastestRoute(filteredRoutes)

    if (cheapestRoute === fastestRoute) {
      res.status(200).json({
        data: [
          {
            ...cheapestRoute,
            protocolData: {
              ...cheapestRoute.protocolData,
              orders: [Order.Cheapest, Order.Fastest]
            }
          }
        ]
      })
      return
    }

    res.status(200).json({
      data: [
        {
          ...cheapestRoute,
          protocolData: {
            ...cheapestRoute.protocolData,
            orders: [Order.Cheapest]
          }
        },
        {
          ...fastestRoute,
          protocolData: {
            ...fastestRoute.protocolData,
            orders: [Order.Fastest]
          }
        }
      ]
    })
  } catch (error: any) {
    res.status(500).json({
      message: error?.message ?? 'Something went wrong',
      data: null
    })
  }
}
