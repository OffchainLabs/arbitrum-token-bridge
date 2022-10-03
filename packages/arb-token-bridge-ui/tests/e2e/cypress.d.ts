import '@synthetixio/synpress/support/index.d.ts'
import {
  login,
  logout,
  restoreAppState,
  saveAppState
} from '../support/commands'
import { NetworkType } from '../support/common'

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to connect MetaMask to the UI.
       * @example cy.login()
       */
      login(
        networkType: NetworkType,
        addNewNetwork?: boolean,
        skipBackgroundSetup?: boolean
      ): typeof login
      logout(): typeof logout
      restoreAppState(): typeof restoreAppState
      saveAppState(): typeof saveAppState
    }
  }
}
