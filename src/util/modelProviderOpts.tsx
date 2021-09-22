// @ts-ignore
import WalletConnectProvider from '@walletconnect/web3-provider'

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
