/* global JQuery */
import '@synthetixio/synpress/support/index.d.ts'
import {
  connectToApp,
  login,
  logout,
  openTransactionsPanel,
  resetCctpAllowance,
  fundUserUsdcTestnet,
  fundUserWalletEth
} from '../support/commands'

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to connect MetaMask to the UI.
       * @example cy.login()
       */
      connectToApp(): typeof connectToApp
      // eslint-disable-next-line no-unused-vars
      login: typeof login
      logout(): typeof logout
      openTransactionsPanel(): typeof openTransactionsPanel
      resetCctpAllowance: typeof resetCctpAllowance
      fundUserUsdcTestnet: typeof fundUserUsdcTestnet
      fundUserWalletEth: typeof fundUserWalletEth
      typeRecursively(text: string): Chainable<JQuery<HTMLElement>>
    }
  }
}
