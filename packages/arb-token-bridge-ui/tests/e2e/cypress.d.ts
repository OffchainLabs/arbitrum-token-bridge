/* global JQuery */
import '@synthetixio/synpress/support/index.d.ts'
import {
  connectToApp,
  login,
  logout,
  openTransactionsPanel,
  resetAllowance
} from '../support/commands'
import { NetworkType, NetworkName } from '../support/common'

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to connect MetaMask to the UI.
       * @example cy.login()
       */
      connectToApp(): typeof connectToApp
      // eslint-disable-next-line no-unused-vars
      login(options: {
        networkType: NetworkType
        networkName?: NetworkName
        url?: string
        query?: { [s: string]: string }
      }): typeof login
      logout(): typeof logout
      openTransactionsPanel(): typeof openTransactionsPanel
      resetAllowance: typeof resetAllowance
      typeRecursively(text: string): Chainable<JQuery<HTMLElement>>
    }
  }
}
