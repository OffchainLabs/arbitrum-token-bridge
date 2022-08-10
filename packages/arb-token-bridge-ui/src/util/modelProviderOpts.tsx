import WalletConnectProvider from '@walletconnect/web3-provider'
import WalletLink from 'walletlink'

import { ChainId, rpcURLs } from './networks'

export const modalProviderOpts = {
  cacheProvider: true,
  providerOptions: {
    walletconnect: {
      package: WalletConnectProvider,
      options: {
        rpc: {
          [ChainId.ArbitrumOne]: rpcURLs[ChainId.ArbitrumOne],
          [ChainId.ArbitrumNova]: rpcURLs[ChainId.ArbitrumNova],
          [ChainId.ArbitrumRinkeby]: rpcURLs[ChainId.ArbitrumRinkeby],
          [ChainId.ArbitrumGoerli]: rpcURLs[ChainId.ArbitrumGoerli]
        },
        infuraId: process.env.REACT_APP_INFURA_KEY // required
      }
    },
    walletlink: {
      package: WalletLink,
      options: {
        appName: 'Arbitrum Bridge', // Required
        infuraId: process.env.REACT_APP_INFURA_KEY, // Required unless you provide a JSON RPC url; see `rpc` below
        chainId: ChainId.ArbitrumOne, // Optional. It defaults to 1 if not provided
        appLogoUrl: null, // Optional. Application logo image URL. favicon is used if unspecified
        darkMode: false // Optional. Use dark theme, defaults to false
      }
    }
  }
}
