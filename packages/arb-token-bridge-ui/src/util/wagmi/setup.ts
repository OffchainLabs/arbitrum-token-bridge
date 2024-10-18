import { createClient, configureChains } from 'wagmi'
import { mainnet, arbitrum } from '@wagmi/core/chains'
import { publicProvider } from 'wagmi/providers/public'
import { connectorsForWallets, getDefaultWallets } from '@rainbow-me/rainbowkit'
import { trustWallet, okxWallet } from '@rainbow-me/rainbowkit/wallets'

import {
  sepolia,
  arbitrumNova,
  arbitrumSepolia,
  localL1Network as local,
  localL2Network as arbitrumLocal,
  localL3Network as l3Local,
  holesky,
  base,
  baseSepolia
} from './wagmiAdditionalNetworks'
import { isTestingEnvironment } from '../CommonUtils'
import { getCustomChainsFromLocalStorage, ChainId } from '../networks'
import { getOrbitChains } from '../orbitChainsList'
import { getWagmiChain } from './getWagmiChain'
import { customInfuraProvider } from '../infura'

const customChains = getCustomChainsFromLocalStorage().map(chain =>
  getWagmiChain(chain.chainId)
)
const wagmiOrbitChains = getOrbitChains().map(chain =>
  getWagmiChain(chain.chainId)
)

const defaultChains = [
  // mainnet, arb1, & arb nova are for network switch tests
  mainnet,
  arbitrum,
  arbitrumNova,
  base,
  // sepolia & arb sepolia are for tx history panel tests
  sepolia,
  arbitrumSepolia,
  baseSepolia,
  holesky
]

const chainList = isTestingEnvironment
  ? [
      ...defaultChains,
      // Orbit chains
      ...wagmiOrbitChains,
      // add local environments during testing
      local,
      arbitrumLocal,
      l3Local,
      // user-added custom chains
      ...customChains
    ]
  : [...defaultChains, ...wagmiOrbitChains, ...customChains]

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
  Base = 'base',
  Sepolia = 'sepolia',
  ArbitrumSepolia = 'arbitrum-sepolia',
  BaseSepolia = 'base-sepolia'
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

    case TargetChainKey.Base:
      return ChainId.Base

    case TargetChainKey.Sepolia:
      return ChainId.Sepolia

    case TargetChainKey.ArbitrumSepolia:
      return ChainId.ArbitrumSepolia

    case TargetChainKey.BaseSepolia:
      return ChainId.BaseSepolia
  }
}

function getChains(targetChainKey: TargetChainKey) {
  const targetChainId = getChainId(targetChainKey)

  // Doing `Array.filter` instead of `Array.find` in case it's empty, just in case.
  const target = chainList.filter(chain => chain.id === targetChainId)
  const others = chainList.filter(chain => chain.id !== targetChainId)

  return [...target, ...others]
}

export function getProps(targetChainKey: string | null) {
  const { chains, provider } = configureChains(
    // Wagmi selects the first chain as the one to target in WalletConnect, so it has to be the first in the array.
    //
    // https://github.com/wagmi-dev/references/blob/main/packages/connectors/src/walletConnect.ts#L114
    getChains(sanitizeTargetChainKey(targetChainKey)),
    [customInfuraProvider(), publicProvider()]
  )

  const { wallets } = getDefaultWallets({
    ...appInfo,
    chains
  })

  const connectors = connectorsForWallets([
    ...wallets,
    {
      groupName: 'More',
      wallets: [
        trustWallet({ chains, projectId }),
        okxWallet({ chains, projectId })
      ]
    }
  ])

  const client = createClient({
    autoConnect: true,
    connectors,
    provider
  })

  return {
    rainbowKitProviderProps: {
      appInfo,
      chains
    },
    wagmiConfigProps: {
      client
    }
  }
}
