import { NextApiRequest, NextApiResponse } from 'next'
import {
  createConfig,
  LiFiStep,
  QuoteRequest,
  TransactionRequest as LiFiTransactionRequest,
  GasCost,
  FeeCost,
  StepToolDetails
} from '@lifi/sdk'
import { BigNumber, constants, utils } from 'ethers'
import { CrosschainTransfersQuote, QueryParams } from './types'

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
export type CrosschainTransfersQuoteWithLifiData = CrosschainTransfersQuote & {
  lifiData: {
    order: Order
    transactionRequest: TransactionRequest
    tool: StepToolDetails
  }
}

function isValidTransactionRequest(
  transactionRequest: LiFiTransactionRequest | undefined
): transactionRequest is TransactionRequest {
  if (!transactionRequest) {
    return false
  }

  const { value, to, data, from, chainId, gasPrice, gasLimit } =
    transactionRequest

  if (!value || !to || !data || !from || !chainId || !gasPrice || !gasLimit) {
    return false
  }

  return true
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

function parseQuoteToCrosschainTransfersQuoteWithLifiData({
  quote,
  fromAmount,
  fromAddress,
  toAddress,
  fromChainId,
  toChainId,
  fromToken,
  toToken,
  order
}: {
  quote: LiFiStep & { transactionRequest: TransactionRequest }
  fromAmount: string
  fromAddress: string
  toAddress: string
  fromChainId: string
  toChainId: string
  fromToken: string
  toToken: string
  order: Order
}): CrosschainTransfersQuoteWithLifiData {
  return {
    durationMs: quote.estimate.executionDuration,
    gas: {
      amount: sumGasCosts(quote.estimate.gasCosts),
      token: quote.estimate.gasCosts![0]!.token
    },
    fee: {
      amount: sumFee(quote.estimate.feeCosts),
      token: quote.estimate.feeCosts![0]!.token
    },
    fromToken,
    toToken,
    fromAmount,
    toAmount: quote.estimate.toAmount,
    fromAddress,
    toAddress,
    fromChainId,
    toChainId,
    spenderAddress: quote.estimate.approvalAddress,
    lifiData: {
      order,
      transactionRequest: quote.transactionRequest,
      tool: quote.toolDetails
    }
  }
}

createConfig({
  integrator: 'arbitrum',
  apiKey: process.env.NEXT_PUBLIC_LIFI_KEY
})

type LifiCrossTransfersQuotesResponse =
  | {
      message: string
      data: null
    }
  | {
      data: CrosschainTransfersQuoteWithLifiData
    }

/** Extending the standard NextJs request with fast bridge transfer params */
export type NextApiRequestWithFastBridgeParams = NextApiRequest & {
  query: QueryParams & {
    slippage?: string
    order: Order
  }
}
export default async function handler(
  req: NextApiRequestWithFastBridgeParams,
  res: NextApiResponse<LifiCrossTransfersQuotesResponse>
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
    slippage,
    order
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
    if (!fromAddress || !utils.isAddress(fromAddress)) {
      res
        .status(400)
        .send({ message: 'fromAddress is not a valid address', data: null })
      return
    }

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

    if (!toToken || !utils.isAddress(toToken)) {
      res
        .status(400)
        .send({ message: 'toToken is not a valid address', data: null })
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

    const parameters = new URLSearchParams({
      fromAddress,
      fromAmount,
      fromToken,
      fromChain: fromChainId,
      toChain: toChainId,
      toToken,
      toAddress,
      integrator: 'arbitrum',
      order
    } satisfies QuoteRequest)

    if (slippage) {
      parameters.set('slippage', (parsedSlippage / 100).toString())
    }

    if (bridgesToExclude && bridgesToExclude.length > 0) {
      bridgesToExclude.forEach(bridgeToExclude => {
        parameters.append('denyBridges', bridgeToExclude)
      })
    }
    if (exchangesToExclude && exchangesToExclude.length > 0) {
      exchangesToExclude.forEach(exchangeToExclude => {
        parameters.append('denyExchanges', exchangeToExclude)
      })
    }

    const quote = await fetch(
      `https://li.quest/v1/quote?${parameters.toString()}`
    ).then(response => {
      if (!response.ok) {
        throw new Error(response.statusText)
      }
      return response.json() as unknown as LiFiStep
    })

    /** LiFi transactionRequest doesn't guarantee to have all fields on TransactionRequest by default */
    if (!isValidTransactionRequest(quote.transactionRequest)) {
      res.status(500).json({
        data: null,
        message: 'Invalid transaction request received.'
      })
      return
    }

    const transactionRequest = quote.transactionRequest
    res.status(200).json({
      data: parseQuoteToCrosschainTransfersQuoteWithLifiData({
        quote: {
          ...quote,
          transactionRequest
        },
        fromAmount,
        fromAddress,
        toAddress,
        fromChainId,
        toChainId,
        fromToken,
        toToken,
        order
      })
    })
  } catch (error: any) {
    res.status(500).json({
      message: error?.message ?? 'Something went wrong',
      data: null
    })
  }
}
