import { Chain } from 'wagmi'
import { StaticJsonRpcProvider } from '@ethersproject/providers'
import { useCallback, useMemo } from 'react'

import { useArbQueryParams } from './useArbQueryParams'
import {
  ChainQueryParam,
  getChainForChainQueryParam,
  getChainQueryParamForChain
} from '../types/ChainQueryParam'
import { ChainId, rpcURLs } from '../util/networks'
import { getPartnerChainsForChain } from '../util/wagmi/getPartnerChainsForChain'

function getPartnerChainsQueryParams(
  chainQueryParam: ChainQueryParam
): ChainQueryParam[] {
  const chain = getChainForChainQueryParam(chainQueryParam)
  const partnerChains = getPartnerChainsForChain(chain)

  return partnerChains.map(chain => getChainQueryParamForChain(chain.id))
}

const getProviderForChainCache: {
  [rpcUrl: string]: StaticJsonRpcProvider
} = {
  // start with empty cache
}

function createProviderWithCache(rpcUrl: string, chainId: ChainId) {
  const provider = new StaticJsonRpcProvider(rpcUrl, chainId)
  getProviderForChainCache[rpcUrl] = provider
  return provider
}

function getProviderForChain(chain: Chain): StaticJsonRpcProvider {
  const rpcUrl = rpcURLs[chain.id]

  if (typeof rpcUrl === 'undefined') {
    throw new Error(`[getProviderForChain] Unexpected chain id: ${chain.id}`)
  }

  const cachedProvider = getProviderForChainCache[rpcUrl]

  if (typeof cachedProvider !== 'undefined') {
    return cachedProvider
  }

  return createProviderWithCache(rpcUrl, chain.id)
}

export function sanitizeQueryParams({
  from,
  to
}: {
  from: ChainQueryParam | undefined
  to: ChainQueryParam | undefined
}): {
  from: ChainQueryParam
  to: ChainQueryParam
} {
  // when both `from` and `to` are undefined, default to Ethereum and Arbitrum One
  if (typeof from === 'undefined' && typeof to === 'undefined') {
    return { from: 'ethereum', to: 'arbitrumOne' }
  }

  // only `from` is undefined
  if (typeof from === 'undefined' && typeof to !== 'undefined') {
    // get the counter
    const [defaultFrom] = getPartnerChainsQueryParams(to)
    return { from: defaultFrom!, to }
  }

  // only `to` is undefined
  if (typeof from !== 'undefined' && typeof to === 'undefined') {
    const [defaultTo] = getPartnerChainsQueryParams(from)
    return { from, to: defaultTo as ChainQueryParam }
  }

  // both values are defined, but `to` is an invalid partner chain
  if (!getPartnerChainsQueryParams(from!).includes(to!)) {
    const [defaultTo] = getPartnerChainsQueryParams(from!)
    return { from: from!, to: defaultTo! }
  }

  return { from: from!, to: to! }
}

export type UseNetworksState = {
  from: Chain
  fromProvider: StaticJsonRpcProvider
  to: Chain
  toProvider: StaticJsonRpcProvider
}

export type UseNetworksSetStateParams = { fromId: ChainId; toId?: ChainId }
export type UseNetworksSetState = (params: UseNetworksSetStateParams) => void

export function useNetworks(): [UseNetworksState, UseNetworksSetState] {
  const [{ from, to }, setQueryParams] = useArbQueryParams()
  const { from: validFrom, to: validTo } = sanitizeQueryParams({ from, to })

  const setState = useCallback(
    (params: UseNetworksSetStateParams) => {
      const fromQueryParam = getChainQueryParamForChain(params.fromId)
      if (!params.toId) {
        const [toQueryParam] = getPartnerChainsQueryParams(fromQueryParam)
        setQueryParams(
          sanitizeQueryParams({ from: fromQueryParam, to: toQueryParam })
        )
        return
      }

      const toQueryParam = getChainQueryParamForChain(params.toId)

      setQueryParams(
        sanitizeQueryParams({ from: fromQueryParam, to: toQueryParam })
      )
    },
    [setQueryParams]
  )

  if (from !== validFrom || to !== validTo) {
    // On the first render, update query params with the sanitized values
    setQueryParams({ from: validFrom, to: validTo })
  }

  // The return values of the hook will always be the sanitized values
  return useMemo(() => {
    const fromChain = getChainForChainQueryParam(validFrom)
    const toChain = getChainForChainQueryParam(validTo)

    return [
      {
        from: fromChain,
        fromProvider: getProviderForChain(fromChain),
        to: toChain,
        toProvider: getProviderForChain(toChain)
      },
      setState
    ]
  }, [validFrom, validTo, setState])
}
