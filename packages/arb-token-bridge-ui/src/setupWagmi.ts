import { createClient, configureChains, goerli } from 'wagmi'
import { mainnet, arbitrum, arbitrumGoerli } from '@wagmi/core/chains'
import { publicProvider } from 'wagmi/providers/public'
import { jsonRpcProvider } from 'wagmi/providers/jsonRpc'
import { connectorsForWallets, getDefaultWallets } from '@rainbow-me/rainbowkit'
import { trustWallet, ledgerWallet } from '@rainbow-me/rainbowkit/wallets'

import { arbitrumNova } from './util/arbitrumNova'
import { rpcURLs } from './util/networks'

const { chains, provider } = configureChains(
  [mainnet, arbitrum, arbitrumNova, goerli, arbitrumGoerli],
  [
    publicProvider(),
    jsonRpcProvider({
      rpc: chain => {
        if (!chain) {
          return { http: '' }
        }
        return {
          http: rpcURLs[chain.id]!
        }
      },
      priority: 1
    })
  ]
)

const appInfo = {
  appName: 'Bridge to Arbitrum'
}

const { wallets } = getDefaultWallets({
  appName: 'Bridge to Arbitrum',
  chains
})

const connectors = connectorsForWallets([
  ...wallets,
  {
    groupName: 'More',
    wallets: [trustWallet({ chains }), ledgerWallet({ chains })]
  }
])

const wagmiClient = createClient({
  autoConnect: true,
  connectors,
  provider
})

export { chains, provider, appInfo, wagmiClient }
