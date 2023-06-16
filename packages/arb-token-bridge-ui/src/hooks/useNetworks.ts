import { Chain } from 'wagmi'
import { StaticJsonRpcProvider } from '@ethersproject/providers'

import { useArbQueryParams } from './useArbQueryParams'
import {
  ChainQueryParam,
  getChainForChainQueryParam,
  getChainQueryParamForChain
} from '../types/ChainQueryParam'
import { rpcURLs } from '../util/networks'
import { getPartnerChainsForChain } from '../util/wagmi/getPartnerChainsForChain'

function getPartnerChainsQueryParams(
  chainQueryParam: ChainQueryParam
): ChainQueryParam[] {
  const chain = getChainForChainQueryParam(chainQueryParam)
  const partnerChains = getPartnerChainsForChain(chain)

  return partnerChains.map(chain => getChainQueryParamForChain(chain))
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
  // when both `from` and `to` are undefined, default to Mainnet and Arbitrum One
  if (typeof from === 'undefined' && typeof to === 'undefined') {
    return { from: 'mainnet', to: 'arbitrumOne' }
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

export type UseNetworksResult = {
  from: Chain
  fromProvider: StaticJsonRpcProvider
  to: Chain
  toProvider: StaticJsonRpcProvider
}

export function useNetworks(): UseNetworksResult {
  const [{ from, to }, setQueryParams] = useArbQueryParams()
  const { from: validFrom, to: validTo } = sanitizeQueryParams({ from, to })

  if (from !== validFrom || to !== validTo) {
    // On the first render, update query params with the sanitized values
    setQueryParams({ from: validFrom, to: validTo })
  }

  // The return values of the hook will always be the sanitized values (including the first render)
  const fromChain = getChainForChainQueryParam(validFrom)
  const toChain = getChainForChainQueryParam(validTo)

  return {
    from: fromChain,
    fromProvider: new StaticJsonRpcProvider(rpcURLs[fromChain.id]),
    to: toChain,
    toProvider: new StaticJsonRpcProvider(rpcURLs[toChain.id])
  }
}
