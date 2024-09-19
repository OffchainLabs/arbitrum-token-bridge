/* global JQuery */
import '@synthetixio/synpress/support/index.d.ts'
import {
  connectToApp,
  login,
  logout,
  openTransactionsPanel,
  searchAndSelectToken,
  fillCustomDestinationAddress,
  typeAmount,
  typeAmount2,
  findAmountInput,
  findAmount2Input,
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
  selectTransactionsPanelTab,
  confirmSpending,
  closeTransactionHistoryPanel,
  claimCctp
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
      selectTransactionsPanelTab: typeof selectTransactionsPanelTab
      openTransactionsPanel: typeof openTransactionsPanel
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
      findGasFeeForChain: typeof findGasFeeForChain
      findGasFeeSummary: typeof findGasFeeSummary
      findMoveFundsButton: typeof findMoveFundsButton
      findSelectTokenButton: typeof findSelectTokenButton
      openTransactionDetails: typeof openTransactionDetails
      closeTransactionDetails: typeof closeTransactionDetails
      closeTransactionHistoryPanel: typeof closeTransactionHistoryPanel
      findTransactionDetailsCustomDestinationAddress: typeof findTransactionDetailsCustomDestinationAddress
      findTransactionInTransactionHistory: typeof findTransactionInTransactionHistory
      findClaimButton: typeof findClaimButton
      confirmSpending: typeof confirmSpending
      claimCctp: typeof claimCctp
    }
  }
}
