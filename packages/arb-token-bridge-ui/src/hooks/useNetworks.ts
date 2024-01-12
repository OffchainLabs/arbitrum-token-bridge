import { Chain, useChainId } from 'wagmi'
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
  xai,
  sepolia,
  arbitrumNova,
  arbitrumSepolia,
  xaiTestnet,
  stylusTestnet,
  localL1Network as local,
  localL2Network as arbitrumLocal
} from '../util/wagmi/wagmiAdditionalNetworks'

import { getPartnerChainsForChainId } from '../util/wagmi/getPartnerChainsForChainId'
import { getWagmiChain } from '../util/wagmi/getWagmiChain'

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

export function getProviderForChainId(chainId: ChainId): StaticJsonRpcProvider {
  const cachedProvider = getProviderForChainCache[chainId]

  if (typeof cachedProvider !== 'undefined') {
    return cachedProvider
  }

  return createProviderWithCache(chainId)
}

export function isSupportedChainId(
  chainId: ChainId | undefined
): chainId is ChainId {
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
    xai.id,
    xaiTestnet.id,
    arbitrumLocal.id,
    local.id,
    ...customChainIds
  ].includes(chainId)
}

export function sanitizeQueryParams({
  sourceChainId,
  destinationChainId,
  walletChainId
}: {
  sourceChainId: ChainId | number | undefined
  destinationChainId: ChainId | number | undefined
  walletChainId: ChainId | number
}): {
  sourceChainId: ChainId | number
  destinationChainId: ChainId | number
} {
  // when both `sourceChain` and `destinationChain` are undefined or invalid,
  // default to connected chainId or Ethereum and Arbitrum One
  if (
    (!sourceChainId && !destinationChainId) ||
    (!isSupportedChainId(sourceChainId) &&
      !isSupportedChainId(destinationChainId))
  ) {
    const [defaultDestinationChainId] = getPartnerChainsIds(walletChainId)
    return {
      sourceChainId: walletChainId,
      destinationChainId: defaultDestinationChainId!
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

/**
 * We keep track of this so we only call `setQueryParams` once.
 */
let didUpdateUrlWithSanitizedValues = false

export function useNetworks(): [UseNetworksState, UseNetworksSetState] {
  const [
    { sourceChain: sourceChainId, destinationChain: destinationChainId },
    setQueryParams
  ] = useArbQueryParams()
  const chainId = useChainId()
  let walletChainId = chainId ?? ChainId.Ethereum
  if (!isSupportedChainId(walletChainId)) {
    // If the wallet chain is not supported, use sourceChainId if valid
    walletChainId = sourceChainId ?? ChainId.Ethereum
  }

  const {
    sourceChainId: validSourceChainId,
    destinationChainId: validDestinationChainId
  } = sanitizeQueryParams({
    sourceChainId,
    destinationChainId,
    walletChainId
  })

  const setState = useCallback(
    ({
      sourceChainId: newSourceChainId,
      destinationChainId: newDestinationChainId
    }: UseNetworksSetStateParams) => {
      if (
        newSourceChainId === destinationChainId ||
        newDestinationChainId === sourceChainId
      ) {
        setQueryParams({
          sourceChain: destinationChainId,
          destinationChain: sourceChainId
        })
        return
      }
      const {
        sourceChainId: validSourceChainId,
        destinationChainId: validDestinationChainId
      } = sanitizeQueryParams({
        sourceChainId: newSourceChainId,
        destinationChainId: newDestinationChainId,
        walletChainId
      })
      setQueryParams({
        sourceChain: validSourceChainId,
        destinationChain: validDestinationChainId
      })
    },
    [destinationChainId, setQueryParams, sourceChainId, walletChainId]
  )

  if (
    sourceChainId !== validSourceChainId ||
    destinationChainId !== validDestinationChainId
  ) {
    if (!didUpdateUrlWithSanitizedValues) {
      // On the first render, update query params with the sanitized values
      setQueryParams({
        sourceChain: validSourceChainId,
        destinationChain: validDestinationChainId
      })

      didUpdateUrlWithSanitizedValues = true
    }
  }

  // The return values of the hook will always be the sanitized values
  return useMemo(() => {
    const sourceChain = getWagmiChain(validSourceChainId)
    const destinationChain = getWagmiChain(validDestinationChainId)

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
