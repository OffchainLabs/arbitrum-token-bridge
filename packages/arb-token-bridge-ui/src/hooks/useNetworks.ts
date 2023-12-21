import { Chain } from 'wagmi'
import { StaticJsonRpcProvider } from '@ethersproject/providers'
import { useCallback, useMemo } from 'react'
import { mainnet, arbitrum, goerli, arbitrumGoerli } from '@wagmi/core/chains'

import { useArbQueryParams } from './useArbQueryParams'
import {
  ChainId,
  getCustomChainsFromLocalStorage,
  rpcURLs
} from '../util/networks'
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

function getPartnerChainsIds(chainId: ChainId): ChainId[] {
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

function isSupportedChainId(chainId: ChainId | undefined): chainId is ChainId {
  if (!chainId) {
    return false
  }

  const customChainIds = getCustomChainsFromLocalStorage().map(
    chain => chain.chainID
  )

  return [
    mainnet.id,
    goerli.id,
    sepolia.id,
    arbitrum.id,
    arbitrumNova.id,
    arbitrumGoerli.id,
    arbitrumSepolia.id,
    stylusTestnet.id,
    xaiTestnet.id,
    arbitrumLocal.id,
    local.id,
    ...customChainIds
  ].includes(chainId)
}

export function sanitizeQueryParams({
  sourceChainId,
  destinationChainId
}: {
  sourceChainId: ChainId | number | undefined
  destinationChainId: ChainId | number | undefined
}): {
  sourceChainId: ChainId | number
  destinationChainId: ChainId | number
} {
  // when both `sourceChain` and `destinationChain` are undefined or invalid, default to Ethereum and Arbitrum One
  if (
    (!sourceChainId && !destinationChainId) ||
    (!isSupportedChainId(sourceChainId) &&
      !isSupportedChainId(destinationChainId))
  ) {
    return {
      sourceChainId: ChainId.Ethereum,
      destinationChainId: ChainId.ArbitrumOne
    }
  }

  // destinationChainId is valid and sourceChainId is undefined
  if (
    !isSupportedChainId(sourceChainId) &&
    isSupportedChainId(destinationChainId)
  ) {
    const [defaultSourceChainId] = getPartnerChainsIds(destinationChainId)
    return { sourceChainId: defaultSourceChainId!, destinationChainId }
  }

  // sourceChainId is valid and destinationChainId is undefined
  if (
    isSupportedChainId(sourceChainId) &&
    !isSupportedChainId(destinationChainId)
  ) {
    const [defaultDestinationChainId] = getPartnerChainsIds(sourceChainId)
    return {
      sourceChainId: sourceChainId,
      destinationChainId: defaultDestinationChainId!
    }
  }

  // destinationChainId is not a partner of sourceChainId
  if (!getPartnerChainsIds(sourceChainId!).includes(destinationChainId!)) {
    const [defaultDestinationChainId] = getPartnerChainsIds(sourceChainId!)
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
      sourceChainId: ChainId
      destinationChainId?: ChainId
    }
  | {
      sourceChainId?: ChainId
      destinationChainId: ChainId
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
    ({ sourceChainId, destinationChainId }: UseNetworksSetStateParams) => {
      const {
        sourceChainId: validSourceChainId,
        destinationChainId: validDestinationChainId
      } = sanitizeQueryParams({
        sourceChainId,
        destinationChainId
      })
      setQueryParams({
        sourceChain: validSourceChainId,
        destinationChain: validDestinationChainId
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
