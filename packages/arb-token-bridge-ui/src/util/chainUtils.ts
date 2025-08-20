import { mainnet, arbitrum } from '@wagmi/core/chains'
import { getCustomChainsFromLocalStorage, isNetwork } from './networks'
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
} from './wagmi/wagmiAdditionalNetworks'
import { getOrbitChains } from './orbitChainsList'

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

export function getDestinationChainIds(
  chainId: ChainId | number,
  {
    includeLifiEnabledChainPairs = false,
    disableTransfersToNonArbitrumChains = false
  }: {
    includeLifiEnabledChainPairs?: boolean
    disableTransfersToNonArbitrumChains?: boolean
  } = {}
): (ChainId | number)[] {
  const { isTestnet, isOrbitChain } = isNetwork(chainId)

  const orbitChains = getOrbitChains({
    mainnet: !isTestnet,
    testnet: isTestnet
  })

  // L1s
  if (chainId === ChainId.Ethereum) {
    const result = [ChainId.ArbitrumOne, ChainId.ArbitrumNova]

    if (includeLifiEnabledChainPairs) {
      result.push(ChainId.Base)
    }

    // include orbit chains that can be bridged to from mainnet
    return [
      ...result,
      ...orbitChains
        .filter(orbitChain => orbitChain.parentChainId === ChainId.ArbitrumOne)
        .map(orbitChain => orbitChain.chainId)
    ]
  }

  if (chainId === ChainId.Sepolia) {
    const result = [ChainId.ArbitrumSepolia]

    if (includeLifiEnabledChainPairs) {
      result.push(ChainId.BaseSepolia)
    }

    // include orbit chains that can be bridged to from sepolia
    return [
      ...result,
      ...orbitChains
        .filter(
          orbitChain => orbitChain.parentChainId === ChainId.ArbitrumSepolia
        )
        .map(orbitChain => orbitChain.chainId)
    ]
  }

  // L2s
  if (chainId === ChainId.ArbitrumOne) {
    const result = [ChainId.Ethereum]

    if (!disableTransfersToNonArbitrumChains && includeLifiEnabledChainPairs) {
      result.push(ChainId.Base)
    }

    // include L3s that can be bridged to from Arbitrum One
    return [
      ...result,
      ...orbitChains
        .filter(orbitChain => orbitChain.parentChainId === ChainId.ArbitrumOne)
        .map(orbitChain => orbitChain.chainId)
    ]
  }

  if (chainId === ChainId.ArbitrumSepolia) {
    const result = [ChainId.Sepolia]

    if (!disableTransfersToNonArbitrumChains && includeLifiEnabledChainPairs) {
      result.push(ChainId.BaseSepolia)
    }

    // include L3s that can be bridged to from Arbitrum Sepolia
    return [
      ...result,
      ...orbitChains
        .filter(
          orbitChain => orbitChain.parentChainId === ChainId.ArbitrumSepolia
        )
        .map(orbitChain => orbitChain.chainId)
    ]
  }

  if (chainId === ChainId.ArbitrumNova) {
    return [ChainId.Ethereum]
  }

  if (chainId === ChainId.Base) {
    if (includeLifiEnabledChainPairs) {
      return [ChainId.ArbitrumOne]
    }
    return []
  }

  if (chainId === ChainId.BaseSepolia) {
    if (includeLifiEnabledChainPairs) {
      return [ChainId.ArbitrumSepolia]
    }
    return []
  }

  // local chains
  if (chainId === ChainId.Local) {
    return [ChainId.ArbitrumLocal]
  }

  if (chainId === ChainId.ArbitrumLocal) {
    return [ChainId.Local, ChainId.L3Local]
  }

  if (chainId === ChainId.L3Local) {
    return [ChainId.ArbitrumLocal]
  }

  // orbit chains
  if (isOrbitChain) {
    const orbitChain = orbitChains.find(chain => chain.chainId === chainId)
    if (orbitChain) {
      return [orbitChain.parentChainId]
    }
  }

  // default case, return empty array
  return []
}
