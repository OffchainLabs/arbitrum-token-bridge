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
