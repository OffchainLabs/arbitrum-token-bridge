import '@synthetixio/synpress/support/index.d.ts'
import { login, logout } from '../support/commands'
declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to connect MetaMask to the UI.
       * @example cy.login()
       */
      login(isL2Network?: boolean): typeof login
      logout(): typeof logout
    }
  }
}
