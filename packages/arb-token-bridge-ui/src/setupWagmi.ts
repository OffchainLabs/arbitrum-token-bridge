import { createClient, configureChains, goerli } from 'wagmi'
import { mainnet, arbitrum, arbitrumGoerli } from '@wagmi/core/chains'
import { publicProvider } from 'wagmi/providers/public'
import { jsonRpcProvider } from 'wagmi/providers/jsonRpc'
import { connectorsForWallets, getDefaultWallets } from '@rainbow-me/rainbowkit'
import { trustWallet, ledgerWallet } from '@rainbow-me/rainbowkit/wallets'

import { arbitrumNova } from './util/arbitrumNova'
import {
  localL1Network as local,
  localL2Network as arbitrumLocal
} from './util/localNetworksForTests'
import { rpcURLs } from './util/networks'
import { isTestingEnvironment } from './util/CommonUtils'

const chainList = isTestingEnvironment
  ? [
      local,
      arbitrumLocal,
      // mainnet, arb1, & arb nova are for network switch tests
      mainnet,
      arbitrum,
      arbitrumNova,
      // goerli & arb goerli are for tx history panel tests
      goerli,
      arbitrumGoerli
    ]
  : [mainnet, arbitrum, arbitrumNova, goerli, arbitrumGoerli]

const { chains, provider } = configureChains(chainList, [
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
])

const appInfo = {
  appName: 'Bridge to Arbitrum'
}

const { wallets } = getDefaultWallets({
...appInfo,
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
