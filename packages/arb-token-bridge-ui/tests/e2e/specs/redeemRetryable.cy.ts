import { formatAmount } from '../../../src/util/NumberUtils'
import {
  getInitialERC20Balance,
  getL1NetworkConfig,
  wethTokenAddressL1,
  getL2NetworkConfig
} from '../../support/common'

describe('Redeem ERC20 Deposit', () => {
  context('User has some ERC20 and is on L1', () => {
    let l1ERC20bal: string

    // log in to metamask before deposit
    before(() => {
      getInitialERC20Balance({
        tokenAddress: wethTokenAddressL1,
        multiCallerAddress: getL1NetworkConfig().multiCall,
        address: Cypress.env('ADDRESS'),
        rpcURL: Cypress.env('ETH_RPC_URL')
      }).then(
        val =>
          (l1ERC20bal = formatAmount(val, {
            symbol: 'WETH'
          }))
      )
    })

    it('should redeem failed retryable successfully', () => {
      cy.login({ networkType: 'L1' })

      context('should trigger a deposit meant for failure', () => {
        cy.findByRole('button', { name: /From: Ethereum/i }).should(
          'be.visible'
        )
        cy.findByRole('button', { name: /Fail Retryable/i })
          .should('be.visible')
          .click()
      })

      context('deposit should be redeemed', () => {
        cy.confirmMetamaskTransaction().then(() => {
          // open transaction history and wait for deposit to fail
          cy.openTransactionsPanel()
          cy.wait(30_000).then(() => {
            // change metamask network so that the retry button activates
            cy.changeMetamaskNetwork(getL2NetworkConfig().networkName).then(
              () => {
                // find the Retry button and the amount in the row
                cy.findByText(
                  `${formatAmount(0.00001, {
                    symbol: 'WETH'
                  })}`
                )
                  .should('be.visible')
                  .parent()
                  .parent()
                  .siblings()
                  .last()
                  .contains(/Retry/i)
                  .should('be.visible')
                  .should('not.be.disabled')
                  .click()

                cy.confirmMetamaskTransaction().then(() => {
                  cy.wait(30_000).then(() => {
                    // switch to settled transactions
                    cy.findByLabelText('show settled transactions')
                      .should('be.visible')
                      .click()

                    // find the same transaction there redeemed successfully
                    cy.findByText(
                      `${formatAmount(0.00001, {
                        symbol: 'WETH'
                      })}`
                    )
                  })
                })
              }
            )
          })
        })
      })
    })
  })
})
