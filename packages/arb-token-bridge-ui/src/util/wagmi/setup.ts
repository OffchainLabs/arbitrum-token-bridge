import { createClient, configureChains, goerli } from 'wagmi'
import { mainnet, arbitrum, arbitrumGoerli } from '@wagmi/core/chains'
import { publicProvider } from 'wagmi/providers/public'
import { connectorsForWallets, getDefaultWallets } from '@rainbow-me/rainbowkit'
import { trustWallet, ledgerWallet } from '@rainbow-me/rainbowkit/wallets'

import {
  sepolia,
  arbitrumNova,
  arbitrumSepolia,
  xaiTestnet,
  stylusTestnet,
  localL1Network as local,
  localL2Network as arbitrumLocal,
  chainToWagmiChain
} from './wagmiAdditionalNetworks'
import { isTestingEnvironment } from '../CommonUtils'
import { ChainId } from '../networks'
import { getCustomChainsFromLocalStorage } from '../networks'

const customChains = getCustomChainsFromLocalStorage().map(chain =>
  chainToWagmiChain(chain)
)

const chainList = isTestingEnvironment
  ? [
      // mainnet, arb1, & arb nova are for network switch tests
      mainnet,
      arbitrum,
      arbitrumNova,
      // goerli & arb goerli are for tx history panel tests
      goerli,
      arbitrumGoerli,
      // sepolia
      sepolia,
      arbitrumSepolia,
      // Orbit chains
      xaiTestnet,
      stylusTestnet,
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
      goerli,
      arbitrumGoerli,
      sepolia,
      arbitrumSepolia,
      xaiTestnet,
      stylusTestnet,
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

export enum TargetChainKey {
  Mainnet = 'mainnet',
  Rinkeby = 'rinkeby',
  ArbitrumRinkeby = 'arbitrum-rinkeby',
  ArbitrumOne = 'arbitrum-one',
  ArbitrumNova = 'arbitrum-nova',
  Goerli = 'goerli',
  ArbitrumGoerli = 'arbitrum-goerli',
  Sepolia = 'sepolia',
  ArbitrumSepolia = 'arbitrum-sepolia',
  Local = 'localhost',
  ArbitrumLocal = 'arbitrum-localhost',
  XaiTestnet = 'xai-testnet',
  StylusTestnet = 'stylus-testnet'
}

function sanitizeTargetChainKey(targetChainKey: string | null): TargetChainKey {
  // Default to Ethereum Mainnet if nothing passed in
  if (targetChainKey === null) {
    return TargetChainKey.Mainnet
  }

  // Default to Ethereum Mainnet if invalid
  if (!(Object.values(TargetChainKey) as string[]).includes(targetChainKey)) {
    return TargetChainKey.Mainnet
  }

  return targetChainKey as TargetChainKey
}

function getChainId(targetChainKey: TargetChainKey): number {
  switch (targetChainKey) {
    case TargetChainKey.Mainnet:
    default:
      return ChainId.Mainnet

    case TargetChainKey.ArbitrumOne:
      return ChainId.ArbitrumOne

    case TargetChainKey.ArbitrumNova:
      return ChainId.ArbitrumNova

    case TargetChainKey.Goerli:
      return ChainId.Goerli

    case TargetChainKey.ArbitrumGoerli:
      return ChainId.ArbitrumGoerli

    case TargetChainKey.Sepolia:
      return ChainId.Sepolia

    case TargetChainKey.ArbitrumSepolia:
      return ChainId.ArbitrumSepolia

    case TargetChainKey.StylusTestnet:
      return ChainId.StylusTestnet

    case TargetChainKey.XaiTestnet:
      return ChainId.XaiTestnet
  }
}

function getChains(targetChainKey: TargetChainKey) {
  const targetChainId = getChainId(targetChainKey)

  // Doing `Array.filter` instead of `Array.find` in case it's empty, just in case.
  const target = chainList.filter(chain => chain.id === targetChainId)
  const others = chainList.filter(chain => chain.id !== targetChainId)

  return [...target, ...others]
}

export function getWalletConnectChain(targetChainKey: string | null) {
  return getChainId(sanitizeTargetChainKey(targetChainKey))
}

export function getProps(targetChainKey: string | null) {
  const { chains, provider } = configureChains(
    // Wagmi selects the first chain as the one to target in WalletConnect, so it has to be the first in the array.
    //
    // https://github.com/wagmi-dev/references/blob/main/packages/connectors/src/walletConnect.ts#L114
    getChains(sanitizeTargetChainKey(targetChainKey)),
    [publicProvider()]
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
        ledgerWallet({ chains, projectId })
      ]
    }
  ])

  const client = createClient({
    autoConnect: true,
    connectors,
    provider
  })

  const initialChain = getWalletConnectChain(targetChainKey)

  return {
    rainbowKitProviderProps: {
      appInfo,
      chains,
      initialChain
    },
    wagmiConfigProps: {
      client
    }
  }
}
