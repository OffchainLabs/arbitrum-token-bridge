/* global JQuery */
import '@synthetixio/synpress/support/index.d.ts'
import {
  acceptTnC,
  login,
  searchAndSelectToken,
  fillCustomDestinationAddress,
  typeAmount,
  typeAmount2,
  findAmountInput,
  findAmount2Input,
  findSourceChainButton,
  findDestinationChainButton,
  findGasFeeSummary,
  findMoveFundsButton,
  clickMoveFundsButton,
  findSelectTokenButton,
  openTransactionDetails,
  closeTransactionDetails,
  findTransactionDetailsCustomDestinationAddress,
  findTransactionInTransactionHistory,
  findClaimButton,
  clickClaimButton,
  selectTransactionsPanelTab,
  confirmSpending,
  claimCctp,
  switchToTransferPanelTab,
  switchToTransactionHistoryTab,
  selectRoute
} from '../support/commands'

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to connect MetaMask to the UI.
       * @example cy.login()
       */
      acceptTnC(): typeof acceptTnC
      // eslint-disable-next-line no-unused-vars
      login: typeof login
      selectTransactionsPanelTab: typeof selectTransactionsPanelTab
      searchAndSelectToken({
        tokenName,
        tokenAddress
      }: {
        tokenName: string
        tokenAddress: string
      }): typeof searchAndSelectToken
      fillCustomDestinationAddress(): typeof fillCustomDestinationAddress
      typeAmount: typeof typeAmount
      typeAmount2: typeof typeAmount2
      findAmountInput: typeof findAmountInput
      findAmount2Input: typeof findAmount2Input
      findSourceChainButton: typeof findSourceChainButton
      findDestinationChainButton: typeof findDestinationChainButton
      findGasFeeSummary: typeof findGasFeeSummary
      findMoveFundsButton: typeof findMoveFundsButton
      clickMoveFundsButton: typeof clickMoveFundsButton
      findSelectTokenButton: typeof findSelectTokenButton
      openTransactionDetails: typeof openTransactionDetails
      closeTransactionDetails: typeof closeTransactionDetails
      switchToTransferPanelTab: typeof switchToTransferPanelTab
      switchToTransactionHistoryTab: typeof switchToTransactionHistoryTab
      findTransactionDetailsCustomDestinationAddress: typeof findTransactionDetailsCustomDestinationAddress
      findTransactionInTransactionHistory: typeof findTransactionInTransactionHistory
      findClaimButton: typeof findClaimButton
      clickClaimButton: typeof clickClaimButton
      confirmSpending: typeof confirmSpending
      claimCctp: typeof claimCctp
      selectRoute: typeof selectRoute
    }
  }
}
