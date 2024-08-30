/* global JQuery */
import '@synthetixio/synpress/support/index.d.ts'
import {
  connectToApp,
  login,
  logout,
  openTransactionsPanel,
  resetCctpAllowance,
  fundUserUsdcTestnet,
  fundUserWalletEth,
  searchAndSelectToken,
  fillCustomDestinationAddress,
  typeAmount,
  findSourceChainButton,
  findDestinationChainButton,
  findGasFeeSummary,
  findGasFeeForChain,
  findMoveFundsButton,
  findSelectTokenButton,
  openTransactionDetails,
  closeTransactionDetails,
  findTransactionDetailsCustomDestinationAddress,
  findTransactionInTransactionHistory,
  findClaimButton,
  selectTransactionsPanelTab
} from '../support/commands'

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to connect MetaMask to the UI.
       * @example cy.login()
       */
      connectToApp: typeof connectToApp
      // eslint-disable-next-line no-unused-vars
      login: typeof login
      logout: typeof logout
      selectTransactionsPanelTab: typeof selectTransactionsPanelTab
      openTransactionsPanel: typeof openTransactionsPanel
      resetCctpAllowance: typeof resetCctpAllowance
      fundUserUsdcTestnet: typeof fundUserUsdcTestnet
      fundUserWalletEth: typeof fundUserWalletEth
      searchAndSelectToken({
        tokenName,
        tokenAddress
      }: {
        tokenName: string
        tokenAddress: string
      }): typeof searchAndSelectToken
      fillCustomDestinationAddress(): typeof fillCustomDestinationAddress
      typeAmount: typeof typeAmount
      findSourceChainButton: typeof findSourceChainButton
      findDestinationChainButton: typeof findDestinationChainButton
      findGasFeeForChain: typeof findGasFeeForChain
      findGasFeeSummary: typeof findGasFeeSummary
      findMoveFundsButton: typeof findMoveFundsButton
      findSelectTokenButton: typeof findSelectTokenButton
      openTransactionDetails: typeof openTransactionDetails
      closeTransactionDetails: typeof closeTransactionDetails
      findTransactionDetailsCustomDestinationAddress: typeof findTransactionDetailsCustomDestinationAddress
      findTransactionInTransactionHistory: typeof findTransactionInTransactionHistory
      findClaimButton: typeof findClaimButton
    }
  }
}
