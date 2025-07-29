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
import { CrosschainTransfersRouteBase, QueryParams, Token } from './types'
import { ether } from '../../../constants'
import { isValidLifiTransfer } from './utils'

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
  const result =
    (gasCosts || []).reduce(
      ({ amount, amountUSD }, gas) => {
        return {
          amount: amount.add(BigNumber.from(gas.estimate)),
          amountUSD: amountUSD + Number(gas.amountUSD)
        }
      },
      { amount: constants.Zero, amountUSD: 0 }
    ) ?? constants.Zero

  return {
    amount: result.amount.toString(),
    amountUSD: result.amountUSD.toString()
  }
}
function sumFee(feeCosts: FeeCost[] | undefined) {
  const result =
    (feeCosts || []).reduce(
      ({ amount, amountUSD }, fee) => {
        return {
          amount: fee.included
            ? amount
            : amount.add(BigNumber.from(fee.amount)),
          amountUSD: fee.included
            ? amountUSD
            : amountUSD + Number(fee.amountUSD)
        }
      },
      { amount: constants.Zero, amountUSD: 0 }
    ) ?? constants.Zero

  return {
    amount: result.amount.toString(),
    amountUSD: result.amountUSD.toString()
  }
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
}): LifiCrosschainTransfersRoute {
  const step = route.steps[0]!
  const tags: Order[] = []
  if (route.tags && route.tags.includes(Order.Cheapest)) {
    tags.push(Order.Cheapest)
  }
  if (route.tags && route.tags.includes(Order.Fastest)) {
    tags.push(Order.Fastest)
  }

  const gasToken: Token =
    step.estimate.gasCosts && step.estimate.gasCosts.length > 0
      ? step.estimate.gasCosts[0]!.token
      : { ...ether, address: constants.AddressZero }

  const feeToken: Token =
    step.estimate.feeCosts && step.estimate.feeCosts.length > 0
      ? step.estimate.feeCosts[0]!.token
      : { ...ether, address: constants.AddressZero }

  return {
    type: 'lifi',
    durationMs: step.estimate.executionDuration * 1_000,
    gas: {
      /** Amount with all decimals (e.g. 100000000000000 for 0.0001 ETH) */
      ...sumGasCosts(step.estimate.gasCosts),
      token: gasToken
    },
    fee: {
      /** Amount with all decimals (e.g. 100000000000000 for 0.0001 ETH) */
      ...sumFee(step.estimate.feeCosts),
      token: feeToken
    },
    fromAmount: {
      /** Amount with all decimals (e.g. 100000000000000 for 0.0001 ETH) */
      amount: step.action.fromAmount,
      amountUSD: step.estimate.fromAmountUSD || '0',
      token: step.action.fromToken
    },
    toAmount: {
      /** Amount with all decimals (e.g. 100000000000000 for 0.0001 ETH) */
      amount: step.estimate.toAmount,
      amountUSD: step.estimate.toAmountUSD || '0',
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
): LifiCrosschainTransfersRoute | undefined {
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

  return cheapestRoute
}

function findFastestRoute(
  routes: LifiCrosschainTransfersRoute[]
): LifiCrosschainTransfersRoute | undefined {
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

  return fastestRoute
}

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

export const INTEGRATOR_ID = '_arbitrum'
export default async function handler(
  req: NextApiRequestWithLifiParams,
  res: NextApiResponse<LifiCrossTransfersRoutesResponse>
) {
  createConfig({
    integrator: INTEGRATOR_ID,
    apiKey: process.env.LIFI_KEY
  })

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
    if (!fromToken || !utils.isAddress(fromToken)) {
      res
        .status(400)
        .send({ message: 'fromToken is not a valid address', data: null })
      return
    }

    if (!toToken || !utils.isAddress(toToken)) {
      res
        .status(400)
        .send({ message: 'toToken is not a valid address', data: null })
      return
    }

    if (
      !isValidLifiTransfer({
        fromToken,
        sourceChainId: Number(fromChainId),
        destinationChainId: Number(toChainId)
      })
    ) {
      res.status(400).send({
        message: `Sending fromToken (${fromToken}) from chain ${fromChainId} to chain ${toChainId} is not supported`,
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
          toChainId
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

    if (!cheapestRoute && !fastestRoute) {
      res.status(204).json({ data: [] })
      return
    }

    if (cheapestRoute && fastestRoute && cheapestRoute === fastestRoute) {
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

    const data: LifiCrosschainTransfersRoute[] = []
    if (cheapestRoute) {
      data.push({
        ...cheapestRoute,
        protocolData: {
          ...cheapestRoute.protocolData,
          orders: [Order.Cheapest]
        }
      })
    }
    if (fastestRoute) {
      data.push({
        ...fastestRoute,
        protocolData: {
          ...fastestRoute.protocolData,
          orders: [Order.Fastest]
        }
      })
    }
    res.status(200).json({
      data
    })
  } catch (error: any) {
    res.status(500).json({
      message: error?.message ?? 'Something went wrong',
      data: null
    })
  }
}
