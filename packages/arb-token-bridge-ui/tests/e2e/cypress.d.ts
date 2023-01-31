import '@synthetixio/synpress/support/index.d.ts'
import {
  connectToApp,
  login,
  logout,
  restoreAppState,
  saveAppState,
  visitHomePage
} from '../support/commands'
import { NetworkType } from '../support/common'

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
      visitHomePage(): typeof visitHomePage
    }
  }
}
