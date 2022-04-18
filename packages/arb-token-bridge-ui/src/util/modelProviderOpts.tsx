// @ts-ignore
import WalletConnectProvider from '@walletconnect/web3-provider'
import WalletLink from 'walletlink'

import { rpcURLs } from './networks'

export const modalProviderOpts = {
  cacheProvider: true,
  providerOptions: {
    // mewconnect: {
    //   package: MewConnect,
    //   options: {
    //     infuraId: process.env.REACT_APP_INFURA_KEY // required
    //   }
    // },
    walletconnect: {
      package: WalletConnectProvider,
      options: {
        rpc: {
          42161: rpcURLs[42161],
          421611: rpcURLs[421611]
        },
        infuraId: process.env.REACT_APP_INFURA_KEY // required
      }
    },
    walletlink: {
      package: WalletLink,
      options: {
        appName: 'Arb Bridge', // Required
        infuraId: process.env.REACT_APP_INFURA_KEY, // Required unless you provide a JSON RPC url; see `rpc` below
        chainId: 42161, // Optional. It defaults to 1 if not provided
        appLogoUrl: null, // Optional. Application logo image URL. favicon is used if unspecified
        darkMode: false // Optional. Use dark theme, defaults to false
      }
    }
    // authereum: {
    //   package: Authereum
    // }
  }
}
