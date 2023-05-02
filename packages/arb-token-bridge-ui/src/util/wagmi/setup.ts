import { createClient, configureChains, goerli } from 'wagmi'
import { mainnet, arbitrum, arbitrumGoerli } from '@wagmi/core/chains'
import { publicProvider } from 'wagmi/providers/public'
import { connectorsForWallets, getDefaultWallets } from '@rainbow-me/rainbowkit'
import { trustWallet, ledgerWallet } from '@rainbow-me/rainbowkit/wallets'

import {
  arbitrumNova,
  localL1Network as local,
  localL2Network as arbitrumLocal
} from './wagmiAdditionalNetworks'
import { isTestingEnvironment } from '../CommonUtils'

const chainList = isTestingEnvironment
  ? [
      mainnet,
      arbitrum,
      arbitrumNova,
      goerli,
      arbitrumGoerli,
      // add local environments during testing
      local,
      arbitrumLocal
    ]
  : [mainnet, arbitrum, arbitrumNova, goerli, arbitrumGoerli]

const { chains, provider } = configureChains(chainList, [publicProvider()])

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
