import { providers } from 'ethers'
import { createClient, configureChains, Chain, ChainProviderFn } from 'wagmi'
import { mainnet, arbitrum } from '@wagmi/core/chains'
import { publicProvider } from 'wagmi/providers/public'
import { connectorsForWallets, getDefaultWallets } from '@rainbow-me/rainbowkit'
import { trustWallet } from '@rainbow-me/rainbowkit/wallets'

import {
  sepolia,
  arbitrumNova,
  arbitrumSepolia,
  stylusTestnet,
  localL1Network as local,
  localL2Network as arbitrumLocal
} from './wagmiAdditionalNetworks'
import { isTestingEnvironment } from '../CommonUtils'
import { ChainId, chainIdToInfuraKey, rpcURLs } from '../networks'
import { getCustomChainsFromLocalStorage } from '../networks'
import { getOrbitChains } from '../orbitChainsList'
import { getWagmiChain } from './getWagmiChain'

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
      // Orbit chains
      stylusTestnet,
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
      stylusTestnet,
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

function getChains(targetChainKey: TargetChainKey) {
  const targetChainId = getChainId(targetChainKey)

  // Doing `Array.filter` instead of `Array.find` in case it's empty, just in case.
  const target = chainList.filter(chain => chain.id === targetChainId)
  const others = chainList.filter(chain => chain.id !== targetChainId)

  return [...target, ...others]
}

function infuraProvider<TChain extends Chain>(): ChainProviderFn<
  TChain,
  providers.InfuraProvider,
  providers.InfuraWebSocketProvider
> {
  return function (chain) {
    // Retrieve the API key for the current chain's network
    const infuraKey = chainIdToInfuraKey(chain.id)

    if (!infuraKey) return null
    if (!chain.rpcUrls.infura?.http[0]) return null

    // Continue with the rest of the function...
    return {
      chain: {
        ...chain,
        rpcUrls: {
          ...chain.rpcUrls,
          default: {
            http: [rpcURLs[chain.id]]
          }
        }
      } as TChain,
      provider: () => {
        const provider = new providers.InfuraProvider(
          {
            chainId: chain.id,
            name: chain.network,
            ensAddress: chain.contracts?.ensRegistry?.address
          },
          infuraKey
        )
        return Object.assign(provider)
      },
      webSocketProvider: () =>
        new providers.InfuraWebSocketProvider(
          {
            chainId: chain.id,
            name: chain.network,
            ensAddress: chain.contracts?.ensRegistry?.address
          },
          infuraKey
        )
    }
  }
}

export function getProps(targetChainKey: string | null) {
  const { chains, provider } = configureChains(
    // Wagmi selects the first chain as the one to target in WalletConnect, so it has to be the first in the array.
    //
    // https://github.com/wagmi-dev/references/blob/main/packages/connectors/src/walletConnect.ts#L114
    getChains(sanitizeTargetChainKey(targetChainKey)),
    [infuraProvider(), publicProvider()]
  )

  const { wallets } = getDefaultWallets({
    ...appInfo,
    chains
  })

  const connectors = connectorsForWallets([
    ...wallets,
    {
      groupName: 'More',
      wallets: [trustWallet({ chains, projectId })]
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
