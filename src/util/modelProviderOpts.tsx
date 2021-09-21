// @ts-ignore
import MewConnect from '@myetherwallet/mewconnect-web-client'
import WalletConnectProvider from '@walletconnect/web3-provider'
import Authereum from 'authereum'

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
        infuraId: process.env.REACT_APP_INFURA_KEY // required
      }
    }
    // authereum: {
    //   package: Authereum
    // }
  }
}
