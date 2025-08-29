import { StaticJsonRpcProvider } from '@ethersproject/providers'
import { useCallback, useMemo } from 'react'
import { Chain } from 'wagmi/chains'

import useSWRImmutable from 'swr/immutable'
import { DisabledFeatures, useArbQueryParams } from './useArbQueryParams'
import { ChainId } from '../types/ChainId'
import { getWagmiChain } from '../util/wagmi/getWagmiChain'
import { getProviderForChainId } from '@/token-bridge-sdk/utils'
import { useDisabledFeatures } from './useDisabledFeatures'
import { isSupportedChainId } from '../util/chainUtils'
import { sanitizeQueryParams } from '../util/queryParamUtils'

export { isSupportedChainId, sanitizeQueryParams }

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
