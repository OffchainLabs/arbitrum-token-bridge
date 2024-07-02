import { mainnet, arbitrum } from '@wagmi/core/chains'
import {
  sepolia,
  arbitrumNova,
  arbitrumSepolia,
  stylusTestnetV2,
  localL1Network as local,
  localL2Network as arbitrumLocal,
  holesky
} from './wagmiAdditionalNetworks'
import { isTestingEnvironment } from '../CommonUtils'
import { getCustomChainsFromLocalStorage, ChainId } from '../networks'
import { getOrbitChains } from '../orbitChainsList'
import { getWagmiChain } from './getWagmiChain'
import { customInfuraProvider } from '../infura'
import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { _chains } from '@rainbow-me/rainbowkit/dist/config/getDefaultConfig'

const customChains = getCustomChainsFromLocalStorage().map(chain =>
  getWagmiChain(chain.chainID)
)
const wagmiOrbitChains = getOrbitChains().map(chain =>
  getWagmiChain(chain.chainID)
)

const chainList = isTestingEnvironment
  ? [
      // mainnet, arb1, & arb nova are for network switch tests
      mainnet,
      arbitrum,
      arbitrumNova,
      // sepolia & arb sepolia are for tx history panel tests
      sepolia,
      arbitrumSepolia,
      holesky,
      // Orbit chains
      stylusTestnetV2,
      ...wagmiOrbitChains,
      // add local environments during testing
      local,
      arbitrumLocal,
      // user-added custom chains
      ...customChains
    ]
  : [
      mainnet,
      arbitrum,
      arbitrumNova,
      sepolia,
      arbitrumSepolia,
      holesky,
      stylusTestnetV2,
      ...wagmiOrbitChains,
      ...customChains
    ]

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!

if (!projectId) {
  console.error('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID variable missing.')
}

const appInfo = {
  appName: 'Bridge to Arbitrum',
  projectId
}

enum TargetChainKey {
  Ethereum = 'mainnet',
  ArbitrumOne = 'arbitrum-one',
  ArbitrumNova = 'arbitrum-nova',
  Sepolia = 'sepolia',
  ArbitrumSepolia = 'arbitrum-sepolia'
}

function sanitizeTargetChainKey(targetChainKey: string | null): TargetChainKey {
  // Default to Ethereum Mainnet if nothing passed in
  if (targetChainKey === null) {
    return TargetChainKey.Ethereum
  }

  // Default to Ethereum Mainnet if invalid
  if (!(Object.values(TargetChainKey) as string[]).includes(targetChainKey)) {
    return TargetChainKey.Ethereum
  }

  return targetChainKey as TargetChainKey
}

function getChainId(targetChainKey: TargetChainKey): number {
  switch (targetChainKey) {
    case TargetChainKey.Ethereum:
      return ChainId.Ethereum

    case TargetChainKey.ArbitrumOne:
      return ChainId.ArbitrumOne

    case TargetChainKey.ArbitrumNova:
      return ChainId.ArbitrumNova

    case TargetChainKey.Sepolia:
      return ChainId.Sepolia

    case TargetChainKey.ArbitrumSepolia:
      return ChainId.ArbitrumSepolia
  }
}

function getChains(targetChainKey: TargetChainKey): _chains {
  const targetChainId = getChainId(targetChainKey)

  // Doing `Array.filter` instead of `Array.find` in case it's empty, just in case.
  const target = chainList.filter(chain => chain.id === targetChainId)
  const others = chainList.filter(chain => chain.id !== targetChainId)

  return [...target, ...others]
}

export function getProps(targetChainKey: string | null) {
  const chains = getChains(sanitizeTargetChainKey(targetChainKey))

  const config = getDefaultConfig({
    ...appInfo,
    chains: getChains(sanitizeTargetChainKey(targetChainKey))
  })

  return {
    rainbowKitProviderProps: {
      appInfo,
      chains
    },
    wagmiConfigProps: {
      config
    }
  }
}
