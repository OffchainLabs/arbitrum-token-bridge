// @ts-ignore
import WalletConnectProvider from '@walletconnect/web3-provider'

import networks from './networks'

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
          42161: networks['42161'].url,
          421611: networks['421611'].url
        },
        infuraId: process.env.REACT_APP_INFURA_KEY // required
      }
    }
    // authereum: {
    //   package: Authereum
    // }
  }
}
