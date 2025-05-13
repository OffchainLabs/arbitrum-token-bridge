import { createClient, configureChains } from 'wagmi'
import { mainnet, arbitrum } from '@wagmi/core/chains'
import { jsonRpcProvider } from 'wagmi/providers/jsonRpc'
import { connectorsForWallets, getDefaultWallets } from '@rainbow-me/rainbowkit'
import {
  trustWallet,
  okxWallet,
  rabbyWallet
} from '@rainbow-me/rainbowkit/wallets'

import {
  sepolia,
  arbitrumNova,
  arbitrumSepolia,
  localL1Network as local,
  localL2Network as arbitrumLocal,
  localL3Network as l3Local,
  base,
  baseSepolia
} from './wagmiAdditionalNetworks'
import {
  isE2eTestingEnvironment,
  isDevelopmentEnvironment
} from '../CommonUtils'
import { getCustomChainsFromLocalStorage, rpcURLs } from '../networks'
import { ChainId } from '../../types/ChainId'
import { getOrbitChains } from '../orbitChainsList'
import { getWagmiChain } from './getWagmiChain'
import { env } from '../../config/env'

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
  baseSepolia
]

const getChainList = () => {
  // for E2E tests, only have local + minimal required chains
  if (isE2eTestingEnvironment) {
    return [
      local,
      arbitrumLocal,
      l3Local,
      sepolia, // required for testing cctp
      arbitrumSepolia, // required for testing cctp
      mainnet // required for import token test
    ]
  }

  // for local env, have all local + default + user added chains
  if (isDevelopmentEnvironment) {
    return [
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
  }

  // for preview + production env, return all non-local chains
  return [...defaultChains, ...wagmiOrbitChains, ...customChains]
}

const chainList = getChainList()

const projectId = env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID

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
    [
      jsonRpcProvider({
        rpc: chain => {
          const rpcUrl = rpcURLs[chain.id]

          if (typeof rpcUrl === 'undefined') {
            throw Error(`[wagmi/setup] no rpc url found for chain ${chain.id}`)
          }

          return { http: rpcUrl }
        }
      })
    ]
  )

  const { wallets } = getDefaultWallets({
    ...appInfo,
    chains
  })

  wallets[0]?.wallets.push(okxWallet({ chains, projectId }))

  const connectors = connectorsForWallets([
    ...wallets,
    {
      groupName: 'More',
      wallets: [trustWallet({ chains, projectId }), rabbyWallet({ chains })]
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
