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
    [mainnet.id]: mainnet,
    // L1 Testnet
    [goerli.id]: goerli,
    [sepolia.id]: sepolia,
    // L2
    [arbitrum.id]: arbitrum,
    [arbitrumNova.id]: arbitrumNova,
    // L2 Testnet
    [arbitrumGoerli.id]: arbitrumGoerli,
    [arbitrumSepolia.id]: arbitrumSepolia,
    // L3
    [xaiTestnet.id]: xaiTestnet,
    [stylusTestnet.id]: stylusTestnet,
    // E2E
    [local.id]: local,
    [arbitrumLocal.id]: arbitrumLocal
  }[chainId]

  return chain ?? mainnet
}

const customChainIds = getCustomChainsFromLocalStorage().map(
  chain => chain.chainID
)
function isSupportedChainId(chainId: ChainId | undefined): boolean {
  if (!chainId) {
    return false
  }

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

function getPartnerChainsQueryParams(chainId: ChainId): ChainId[] {
  const partnerChains = getPartnerChainsForChainId(chainId)
  return partnerChains.map(chain => chain.id)
}

const getProviderForChainCache: {
  [chainId: number]: StaticJsonRpcProvider
} = {
  // start with empty cache
}

function createProviderWithCache(chainId: ChainId) {
  const chain = getChainByChainId(chainId)
  const rpcUrl = rpcURLs[chainId]
  const provider = new StaticJsonRpcProvider(rpcUrl, chainId)
  getProviderForChainCache[chain.id] = provider
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
  const defaultState = {
    sourceChainId: ChainId.Ethereum,
    destinationChainId: ChainId.ArbitrumOne
  }
  // when both `sourceChain` and `destinationChain` are undefined, default to Ethereum and Arbitrum One
  if (
    typeof sourceChainId === 'undefined' &&
    typeof destinationChainId === 'undefined'
  ) {
    return defaultState
  }

  // only `destinationChainId` is defined
  if (
    typeof sourceChainId === 'undefined' &&
    typeof destinationChainId !== 'undefined'
  ) {
    if (!isSupportedChainId(destinationChainId)) {
      return defaultState
    }

    const [defaultSourceChainId] =
      getPartnerChainsQueryParams(destinationChainId)
    return { sourceChainId: defaultSourceChainId!, destinationChainId }
  }

  // only `sourceChainId` is defined
  if (
    typeof sourceChainId !== 'undefined' &&
    typeof destinationChainId === 'undefined'
  ) {
    if (!isSupportedChainId(sourceChainId)) {
      return defaultState
    }

    const [defaultDestinationChainId] =
      getPartnerChainsQueryParams(sourceChainId)
    return {
      sourceChainId: sourceChainId,
      destinationChainId: defaultDestinationChainId!
    }
  }

  if (
    !isSupportedChainId(sourceChainId) &&
    !isSupportedChainId(destinationChainId)
  ) {
    return defaultState
  }

  // sourceChainId is invalid, destinationChainId is valid
  if (!isSupportedChainId(sourceChainId)) {
    // Set sourceChainId according to destinationChainId
    const [defaultSourceChainId] = getPartnerChainsQueryParams(
      destinationChainId!
    )
    return {
      sourceChainId: defaultSourceChainId!,
      destinationChainId: destinationChainId!
    }
  }

  if (!isSupportedChainId(destinationChainId)) {
    // Set destinationChainId according to sourceChainId
    const [defaultDestinationChainId] = getPartnerChainsQueryParams(
      sourceChainId!
    )
    return {
      sourceChainId: sourceChainId!,
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

export type UseNetworksSetStateParams = {
  sourceChain: ChainId
  destinationChain?: ChainId
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
