import '@synthetixio/synpress/support/index.d.ts'
import {
  connectToApp,
  login,
  logout,
  restoreAppState,
  saveAppState,
  sendEth
} from '../support/commands'
import { NetworkType } from '../support/common'
import { BigNumber } from 'ethers'
import { Provider } from '@ethersproject/providers'

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to connect MetaMask to the UI.
       * @example cy.login()
       */
      login(networkType: NetworkType, addNewNetwork?: boolean): typeof login
      logout(): typeof logout
      connectToApp(): typeof connectToApp
      restoreAppState(): typeof restoreAppState
      saveAppState(): typeof saveAppState
      sendEth(to: string, amount: BigNumber, provider: Provider): typeof sendEth
    }
  }
}
