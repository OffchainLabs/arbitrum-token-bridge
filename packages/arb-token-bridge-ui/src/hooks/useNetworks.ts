import { StaticJsonRpcProvider } from '@ethersproject/providers'
import { useCallback, useMemo } from 'react'
import { mainnet, arbitrum } from '@wagmi/core/chains'
import { Chain } from 'wagmi/chains'

import useSWRImmutable from 'swr/immutable'
import { DisabledFeatures, useArbQueryParams } from './useArbQueryParams'
import { getCustomChainsFromLocalStorage, isNetwork } from '../util/networks'
import { ChainId } from '../types/ChainId'
import {
  sepolia,
  arbitrumNova,
  arbitrumSepolia,
  localL1Network as local,
  localL2Network as arbitrumLocal,
  localL3Network as l3Local,
  base,
  baseSepolia
} from '../util/wagmi/wagmiAdditionalNetworks'

import { getDestinationChainIds } from '../util/networks'
import { getWagmiChain } from '../util/wagmi/getWagmiChain'
import { getOrbitChains } from '../util/orbitChainsList'
import { getProviderForChainId } from '@/token-bridge-sdk/utils'
import { useDisabledFeatures } from './useDisabledFeatures'

export function isSupportedChainId(
  chainId: ChainId | undefined
): chainId is ChainId {
  if (!chainId) {
    return false
  }

  const customChainIds = getCustomChainsFromLocalStorage().map(
    chain => chain.chainId
  )

  return [
    mainnet.id,
    sepolia.id,
    arbitrum.id,
    arbitrumNova.id,
    base.id,
    arbitrumSepolia.id,
    baseSepolia.id,
    arbitrumLocal.id,
    l3Local.id,
    local.id,
    ...getOrbitChains().map(chain => chain.chainId),
    ...customChainIds
  ].includes(chainId)
}

const cache: Record<
  string,
  {
    sourceChainId: number
    destinationChainId: number
  }
> = {}
export function sanitizeQueryParams({
  sourceChainId,
  destinationChainId,
  disableTransfersToNonArbitrumChains = false
}: {
  sourceChainId: ChainId | number | undefined
  destinationChainId: ChainId | number | undefined
  disableTransfersToNonArbitrumChains?: boolean
}): {
  sourceChainId: ChainId | number
  destinationChainId: ChainId | number
} {
  const key = `${sourceChainId}-${destinationChainId}-${disableTransfersToNonArbitrumChains}`
  const cacheHit = cache[key]
  if (cacheHit) {
    return cacheHit
  }

  if (
    (!sourceChainId && !destinationChainId) ||
    (!isSupportedChainId(sourceChainId) &&
      !isSupportedChainId(destinationChainId))
  ) {
    // when both `sourceChain` and `destinationChain` are undefined or invalid, default to Ethereum and Arbitrum One
    return (cache[key] = {
      sourceChainId: ChainId.Ethereum,
      destinationChainId: ChainId.ArbitrumOne
    })
  }

  // destinationChainId is supported and sourceChainId is undefined
  if (
    !isSupportedChainId(sourceChainId) &&
    isSupportedChainId(destinationChainId)
  ) {
    const [defaultSourceChainId] = getDestinationChainIds(
      destinationChainId,
      disableTransfersToNonArbitrumChains
    )

    const isInvalidDestinationChainId =
      disableTransfersToNonArbitrumChains &&
      isNetwork(destinationChainId).isNonArbitrumNetwork

    if (
      typeof defaultSourceChainId === 'undefined' ||
      isInvalidDestinationChainId
    ) {
      return (cache[key] = {
        sourceChainId: ChainId.Ethereum,
        destinationChainId: ChainId.ArbitrumOne
      })
    }

    return (cache[key] = {
      sourceChainId: defaultSourceChainId,
      destinationChainId
    })
  }

  // sourceChainId is valid and destinationChainId is undefined
  if (
    isSupportedChainId(sourceChainId) &&
    !isSupportedChainId(destinationChainId)
  ) {
    const [defaultDestinationChainId] = getDestinationChainIds(
      sourceChainId,
      disableTransfersToNonArbitrumChains
    )

    if (typeof defaultDestinationChainId === 'undefined') {
      return (cache[key] = {
        sourceChainId: ChainId.Ethereum,
        destinationChainId: ChainId.ArbitrumOne
      })
    }

    return (cache[key] = {
      sourceChainId: sourceChainId,
      destinationChainId: defaultDestinationChainId
    })
  }

  // destinationChainId is not a partner of sourceChainId
  if (
    !getDestinationChainIds(
      sourceChainId!,
      disableTransfersToNonArbitrumChains
    ).includes(destinationChainId!)
  ) {
    const [defaultDestinationChainId] = getDestinationChainIds(
      sourceChainId!,
      disableTransfersToNonArbitrumChains
    )

    if (!defaultDestinationChainId) {
      return (cache[key] = {
        sourceChainId: ChainId.Ethereum,
        destinationChainId: ChainId.ArbitrumOne
      })
    }

    return (cache[key] = {
      sourceChainId: sourceChainId!,
      destinationChainId: defaultDestinationChainId!
    })
  }

  return (cache[key] = {
    sourceChainId: sourceChainId!,
    destinationChainId: destinationChainId!
  })
}

export type UseNetworksState = {
  sourceChain: Chain
  sourceChainProvider: StaticJsonRpcProvider
  destinationChain: Chain
  destinationChainProvider: StaticJsonRpcProvider
}

export type UseNetworksSetStateParams = {
  sourceChainId: ChainId
  destinationChainId?: ChainId
}
export type UseNetworksSetState = (params: UseNetworksSetStateParams) => void

export function useNetworks(): [UseNetworksState, UseNetworksSetState] {
  const [
    { sourceChain: sourceChainId, destinationChain: destinationChainId },
    setQueryParams
  ] = useArbQueryParams()

  const { isFeatureDisabled } = useDisabledFeatures()

  const disableTransfersToNonArbitrumChains = isFeatureDisabled(
    DisabledFeatures.TRANSFERS_TO_NON_ARBITRUM_CHAINS
  )

  const {
    sourceChainId: validSourceChainId,
    destinationChainId: validDestinationChainId
  } = useMemo(
    () =>
      sanitizeQueryParams({
        sourceChainId,
        destinationChainId,
        disableTransfersToNonArbitrumChains
      }),
    [destinationChainId, sourceChainId, disableTransfersToNonArbitrumChains]
  )

  const {
    data = {
      sourceChain: getWagmiChain(validSourceChainId),
      destinationChain: getWagmiChain(validDestinationChainId)
    }
  } = useSWRImmutable(
    [validSourceChainId, validDestinationChainId, 'useNetworks'] as const,
    ([_validSourceChainId, _validDestinationChainId]) => {
      const sourceChain = getWagmiChain(_validSourceChainId)
      const destinationChain = getWagmiChain(_validDestinationChainId)
      return { sourceChain, destinationChain }
    }
  )

  const setState = useCallback(
    ({
      sourceChainId: newSourceChainId,
      destinationChainId: newDestinationChainId
    }: UseNetworksSetStateParams) => {
      const {
        sourceChainId: validSourceChainId,
        destinationChainId: validDestinationChainId
      } = sanitizeQueryParams({
        sourceChainId: newSourceChainId,
        destinationChainId: newDestinationChainId,
        disableTransfersToNonArbitrumChains
      })
      setQueryParams({
        sourceChain: validSourceChainId,
        destinationChain: validDestinationChainId
      })
    },
    [setQueryParams, disableTransfersToNonArbitrumChains]
  )

  // The return values of the hook will always be the sanitized values
  return useMemo(() => {
    return [
      {
        sourceChain: data.sourceChain,
        sourceChainProvider: getProviderForChainId(validSourceChainId),
        destinationChain: data.destinationChain,
        destinationChainProvider: getProviderForChainId(validDestinationChainId)
      },
      setState
    ]
  }, [
    data.destinationChain,
    data.sourceChain,
    setState,
    validDestinationChainId,
    validSourceChainId
  ])
}
