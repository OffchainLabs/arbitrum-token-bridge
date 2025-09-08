import useSWR from 'swr'
import { getAPIBaseUrl } from '../util'
import {
  LifiCrosschainTransfersRoute,
  LifiParams
} from '@/bridge/app/api/crosschain-transfers/lifi'
import { Address } from 'viem'
import { useDebounce } from '@uidotdev/usehooks'

export type UseLifiCrossTransfersRouteParams = Pick<
  LifiParams,
  'fromAmount' | 'fromToken' | 'toToken' | 'slippage' | 'fromAddress'
> & {
  enabled?: boolean
  toAddress: Address | undefined
  fromChainId: number
  toChainId: number
  denyBridges?: string[]
  denyExchanges?: string[]
}

export const useLifiCrossTransfersRoute = ({
  enabled = true,
  fromAmount,
  fromToken,
  toToken,
  fromChainId,
  toChainId,
  fromAddress,
  toAddress,
  denyBridges,
  denyExchanges,
  slippage
}: UseLifiCrossTransfersRouteParams) => {
  /** Fetch only after 1 second elapsed since last parameter changed */
  const queryKey = useDebounce(
    enabled && fromAmount !== '0'
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
          'useLifiCrossTransfersRoute'
        ] as const)
      : null,
    1 * 1000 // 1 second in miliseconds
  )

  return useSWR(
    queryKey,
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
      _slippage
    ]) => {
      const urlParams = new URLSearchParams({
        fromAmount: _fromAmount,
        fromChainId: _fromChainId.toString(),
        toChainId: _toChainId.toString(),
        fromToken: _fromToken,
        toToken: _toToken
      })

      if (_fromAddress) {
        urlParams.append('fromAddress', _fromAddress)
      }

      if (_toAddress) {
        urlParams.append('toAddress', _toAddress)
      }

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

        return data as Promise<{ data: LifiCrosschainTransfersRoute[] }>
      })

      return response.data
    },
    {
      refreshInterval: 1 * 60 * 1_000, // 1 minutes in miliseconds
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      shouldRetryOnError: false
    }
  )
}
