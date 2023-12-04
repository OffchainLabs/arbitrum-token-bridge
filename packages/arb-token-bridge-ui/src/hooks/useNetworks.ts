import { Chain } from 'wagmi'
import { StaticJsonRpcProvider } from '@ethersproject/providers'
import { useCallback, useMemo } from 'react'
import { mainnet, arbitrum, goerli, arbitrumGoerli } from '@wagmi/core/chains'

import { useArbQueryParams } from './useArbQueryParams'
import { ChainId, rpcURLs } from '../util/networks'
import {
  sepolia,
  arbitrumNova,
  arbitrumSepolia,
  xaiTestnet,
  stylusTestnet,
  localL1Network as local,
  localL2Network as arbitrumLocal
} from '../util/wagmi/wagmiAdditionalNetworks'

import { getPartnerChainsForChainId } from '../util/wagmi/getPartnerChainsForChainId'

function getChainByChainId(chainId: ChainId): Chain {
  const chain = {
    // L1
    [ChainId.Ethereum]: mainnet,
    // L1 Testnet
    [ChainId.Goerli]: goerli,
    [ChainId.Sepolia]: sepolia,
    // L2
    [ChainId.ArbitrumOne]: arbitrum,
    [ChainId.ArbitrumNova]: arbitrumNova,
    // L2 Testnet
    [ChainId.ArbitrumGoerli]: arbitrumGoerli,
    [ChainId.ArbitrumSepolia]: arbitrumSepolia,
    // L3
    [ChainId.XaiTestnet]: xaiTestnet,
    [ChainId.StylusTestnet]: stylusTestnet,
    // E2E
    [ChainId.Local]: local,
    [ChainId.ArbitrumLocal]: arbitrumLocal
  }[chainId]

  return chain
}

function getPartnerChainsQueryParams(chainId: ChainId): ChainId[] {
  try {
    const partnerChains = getPartnerChainsForChainId(chainId)
    return partnerChains.map(chain => chain.id)
  } catch (e) {
    return []
  }
}

const getProviderForChainCache: {
  [chainId: number]: StaticJsonRpcProvider
} = {
  // start with empty cache
}

function createProviderWithCache(chainId: ChainId) {
  const rpcUrl = rpcURLs[chainId]
  const provider = new StaticJsonRpcProvider(rpcUrl, chainId)
  getProviderForChainCache[chainId] = provider
  return provider
}

function getProviderForChainId(chainId: ChainId): StaticJsonRpcProvider {
  const cachedProvider = getProviderForChainCache[chainId]

  if (typeof cachedProvider !== 'undefined') {
    return cachedProvider
  }

  return createProviderWithCache(chainId)
}

export function sanitizeQueryParams({
  sourceChainId,
  destinationChainId
}: {
  sourceChainId: ChainId | undefined
  destinationChainId: ChainId | undefined
}): {
  sourceChainId: ChainId
  destinationChainId: ChainId
} {
  // when both `sourceChain` and `destinationChain` are undefined, default to Ethereum and Arbitrum One
  if (
    typeof sourceChainId === 'undefined' &&
    typeof destinationChainId === 'undefined'
  ) {
    return {
      sourceChainId: ChainId.Ethereum,
      destinationChainId: ChainId.ArbitrumOne
    }
  }

  // only `destinationChainId` is defined
  if (
    typeof sourceChainId === 'undefined' &&
    typeof destinationChainId !== 'undefined'
  ) {
    const [defaultSourceChainId] =
      getPartnerChainsQueryParams(destinationChainId)
    return { sourceChainId: defaultSourceChainId!, destinationChainId }
  }

  // only `sourceChainId` is defined
  if (
    typeof sourceChainId !== 'undefined' &&
    typeof destinationChainId === 'undefined'
  ) {
    const [defaultDestinationChainId] =
      getPartnerChainsQueryParams(sourceChainId)
    return {
      sourceChainId: sourceChainId,
      destinationChainId: defaultDestinationChainId!
    }
  }

  if (
    !getPartnerChainsQueryParams(sourceChainId!).includes(destinationChainId!)
  ) {
    const [defaultDestinationChainId] = getPartnerChainsQueryParams(
      sourceChainId!
    )
    return {
      sourceChainId: sourceChainId!,
      destinationChainId: defaultDestinationChainId!
    }
  }

  return {
    sourceChainId: sourceChainId!,
    destinationChainId: destinationChainId!
  }
}

export type UseNetworksState = {
  sourceChain: Chain
  sourceChainProvider: StaticJsonRpcProvider
  destinationChain: Chain
  destinationChainProvider: StaticJsonRpcProvider
}

export type UseNetworksSetStateParams =
  | {
      sourceChain: ChainId
      destinationChain?: ChainId
    }
  | {
      sourceChain?: ChainId
      destinationChain: ChainId
    }
export type UseNetworksSetState = (params: UseNetworksSetStateParams) => void

export function useNetworks(): [UseNetworksState, UseNetworksSetState] {
  const [
    { sourceChain: sourceChainId, destinationChain: destinationChainId },
    setQueryParams
  ] = useArbQueryParams()
  const {
    sourceChainId: validSourceChainId,
    destinationChainId: validDestinationChainId
  } = sanitizeQueryParams({
    sourceChainId,
    destinationChainId
  })

  const setState = useCallback(
    (params: UseNetworksSetStateParams) => {
      if (!params.sourceChain) {
        const [sourceChainId] = getPartnerChainsQueryParams(
          params.destinationChain
        )

        const {
          sourceChainId: sourceChain,
          destinationChainId: destinationChain
        } = sanitizeQueryParams({
          sourceChainId: sourceChainId,
          destinationChainId: params.destinationChain
        })
        setQueryParams({
          sourceChain,
          destinationChain
        })
        return
      }

      if (!params.destinationChain) {
        const [destinationChainId] = getPartnerChainsQueryParams(
          params.sourceChain
        )

        const {
          sourceChainId: sourceChain,
          destinationChainId: destinationChain
        } = sanitizeQueryParams({
          sourceChainId: params.sourceChain,
          destinationChainId: destinationChainId
        })
        setQueryParams({
          sourceChain,
          destinationChain
        })
        return
      }

      const {
        sourceChainId: sourceChain,
        destinationChainId: destinationChain
      } = sanitizeQueryParams({
        sourceChainId: params.sourceChain,
        destinationChainId: params.destinationChain
      })
      setQueryParams({
        sourceChain,
        destinationChain
      })
    },
    [setQueryParams]
  )

  if (
    sourceChainId !== validSourceChainId ||
    destinationChainId !== validDestinationChainId
  ) {
    // On the first render, update query params with the sanitized values
    setQueryParams({
      sourceChain: validSourceChainId,
      destinationChain: validDestinationChainId
    })
  }

  // The return values of the hook will always be the sanitized values
  return useMemo(() => {
    const sourceChain = getChainByChainId(validSourceChainId)
    const destinationChain = getChainByChainId(validDestinationChainId)

    return [
      {
        sourceChain,
        sourceChainProvider: getProviderForChainId(validSourceChainId),
        destinationChain,
        destinationChainProvider: getProviderForChainId(validDestinationChainId)
      },
      setState
    ]
  }, [validSourceChainId, validDestinationChainId, setState])
}
