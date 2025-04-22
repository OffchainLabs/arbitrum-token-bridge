import useSWR from 'swr'
import { getAPIBaseUrl } from '../util'
import {
  LifiCrosschainTransfersQuote,
  LifiParams
} from '../pages/api/crosschain-transfers/lifi'
import { Address } from 'wagmi'

export type UseLifiCrossTransfersQuoteParams = Pick<
  LifiParams,
  'fromAmount' | 'fromToken' | 'toToken' | 'slippage' | 'order'
> & {
  fromAddress: Address | undefined
  toAddress: Address | undefined
  fromChainId: number
  toChainId: number
  denyBridges?: string[]
  denyExchanges?: string[]
}

export const useLifiCrossTransfersQuote = ({
  fromAmount,
  fromToken,
  toToken,
  fromChainId,
  toChainId,
  fromAddress,
  toAddress,
  denyBridges,
  denyExchanges,
  slippage,
  order
}: UseLifiCrossTransfersQuoteParams) => {
  return useSWR(
    fromAddress && toAddress && fromAmount !== '0'
      ? ([
          fromAmount,
          fromToken,
          toToken,
          fromChainId,
          toChainId,
          fromAddress,
          toAddress,
          denyBridges,
          denyExchanges,
          slippage,
          order,
          'useLifiCrossTransfersQuote'
        ] as const)
      : null,
    async ([
      _fromAmount,
      _fromToken,
      _toToken,
      _fromChainId,
      _toChainId,
      _fromAddress,
      _toAddress,
      _denyBridges,
      _denyExchanges,
      _slippage,
      _order
    ]) => {
      const urlParams = new URLSearchParams({
        fromAddress: _fromAddress,
        fromAmount: _fromAmount,
        fromChainId: _fromChainId.toString(),
        toChainId: _toChainId.toString(),
        fromToken: _fromToken,
        toToken: _toToken,
        toAddress: _toAddress,
        order: _order
      })

      if (_denyBridges && _denyBridges.length > 0) {
        _denyBridges.map(denyBridge =>
          urlParams.append('denyBridges', denyBridge)
        )
      }
      if (_denyExchanges && _denyExchanges.length > 0) {
        _denyExchanges.map(denyExchange =>
          urlParams.append('denyExchanges', denyExchange)
        )
      }
      if (_slippage) {
        urlParams.set('slippage', _slippage.toString())
      }

      const response = await fetch(
        `${getAPIBaseUrl()}/api/crosschain-transfers/lifi?${urlParams.toString()}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }
      ).then(async response => {
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.message)
        }

        return data as Promise<{ data: LifiCrosschainTransfersQuote }>
      })

      return response.data
    },
    {
      refreshInterval: 1 * 60 * 1_000, // 1 minutes in miliseconds
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      shouldRetryOnError: false,
      keepPreviousData: true
    }
  )
}
