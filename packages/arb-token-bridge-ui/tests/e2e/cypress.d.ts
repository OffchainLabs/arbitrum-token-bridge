import '@synthetixio/synpress/support/index.d.ts'
import {
  connectToApp,
  login,
  logout,
  restoreAppState,
  saveAppState,
  wrapEth,
  fundWalletWithEth
} from '../support/commands'
import { NetworkType } from '../support/common'
import { BigNumber } from 'ethers'

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
      wrapEth(amount: BigNumber): typeof wrapEth
      fundWalletWithEth(
        accountNameOrNumberFrom: string | number,
        accountNameOrNumberTo: string | number,
        amount: number
      ): typeof fundWalletWithEth
    }
  }
}
