import { Chain } from 'wagmi'
import { StaticJsonRpcProvider } from '@ethersproject/providers'
import { create } from 'zustand'

import { useArbQueryParams } from './useArbQueryParams'
import {
  ChainQueryParam,
  getChainForChainQueryParam,
  getChainQueryParamForChain
} from '../types/ChainQueryParam'
import { rpcURLs } from '../util/networks'
import { getPartnerChainsForChain } from '../util/wagmi/getPartnerChainsForChain'
import { chains } from '../constants'

function getPartnerChainsQueryParams(
  chainQueryParam: ChainQueryParam
): ChainQueryParam[] {
  const chain = getChainForChainQueryParam(chainQueryParam)
  const partnerChains = getPartnerChainsForChain(chain)

  return partnerChains.map(chain => getChainQueryParamForChain(chain))
}

function getProviderForChain(chain: Chain): StaticJsonRpcProvider {
  const rpcUrl = rpcURLs[chain.id]

  if (typeof rpcUrl === 'undefined') {
    throw new Error(`[getProviderForChain] Unexpected chain id: ${chain.id}`)
  }

  return new StaticJsonRpcProvider(rpcUrl)
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

type UseNetworksSetStateProps = { from: Chain; to: Chain }
type UseNetworksSetState = (props: UseNetworksSetStateProps) => void

export type UseNetworksState = [
  {
    from: Chain
    fromProvider: StaticJsonRpcProvider
    to: Chain
    toProvider: StaticJsonRpcProvider
  },
  UseNetworksSetState
]

const useNetworksState = create<UseNetworksState>(set => [
  {
    from: chains.mainnet,
    fromProvider: getProviderForChain(chains.mainnet),
    to: chains.arbitrumOne,
    toProvider: getProviderForChain(chains.arbitrumOne)
  },
  (props: UseNetworksSetStateProps) => {
    set(state => {
      const [, setNetworks] = state

      // Update the state but keep the second element (setter) intact
      return [
        {
          from: props.from,
          fromProvider: getProviderForChain(props.from),
          to: props.to,
          toProvider: getProviderForChain(props.to)
        },
        setNetworks
      ]
    })
  }
])

export function useNetworks(): UseNetworksState {
  const [state, setState] = useNetworksState()
  const [{ from, to }, setQueryParams] = useArbQueryParams()
  const { from: validFrom, to: validTo } = sanitizeQueryParams({ from, to })

  console.log({ from, to })

  if (from !== validFrom || to !== validTo) {
    // The return values of the hook will always be the sanitized values (including the first render)
    const fromChain = getChainForChainQueryParam(validFrom)
    const toChain = getChainForChainQueryParam(validTo)

    // On the first render, update query params with the sanitized values
    setQueryParams({ from: validFrom, to: validTo })
    setState({ from: fromChain, to: toChain })

    return [
      {
        from: fromChain,
        fromProvider: getProviderForChain(fromChain),
        to: toChain,
        toProvider: getProviderForChain(toChain)
      },
      setState
    ]
  }

  // Everything is in sync, so we can just return values from the store
  return [state, setState]
}
