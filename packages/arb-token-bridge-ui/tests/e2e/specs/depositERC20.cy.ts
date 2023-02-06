/**
 * When user wants to bridge ERC20 from L1 to L2
 */

import { formatAmount } from '../../../src/util/NumberUtils'
import { resetSeenTimeStampCache } from '../../support/commands'
import {
  ERC20TokenAddressL1,
  addErc20Token,
  getInitialERC20Balance,
  ethRpcUrl,
  l1NetworkConfig,
  zeroToLessThanOneETH
} from '../../support/common'

describe('Deposit ERC20 Token', () => {
  // when all of our tests need to run in a logged-in state
  // we have to make sure we preserve a healthy LocalStorage state
  // because it is cleared between each `it` cypress test
  const ERC20AmountToSend = 0.0001

  before(() => {
    // before this spec, make sure the cache is fresh
    // otherwise pending transactions from last ran specs will leak in this
    resetSeenTimeStampCache()
  })

  beforeEach(() => {
    cy.restoreAppState()
  })
  afterEach(() => {
    cy.saveAppState()
  })

  // Happy Path
  context('User has some ERC20 and is on L1', () => {
    let l1ERC20bal: string

    // log in to metamask before deposit
    before(() => {
      getInitialERC20Balance(
        ERC20TokenAddressL1,
        l1NetworkConfig.l1MultiCall,
        ethRpcUrl
      ).then(
        val =>
          (l1ERC20bal = formatAmount(val, {
            symbol: 'WETH'
          }))
      )
      cy.login('L1')
    })
    after(() => {
      // after all assertions are executed, logout and reset the account
      cy.logout()
    })
    it('should show L1 and L2 chains, and ETH correctly', () => {
      cy.findByRole('button', { name: /From: Ethereum/i }).should('be.visible')
      cy.findByRole('button', { name: /To: Arbitrum/i }).should('be.visible')
      cy.findByRole('button', { name: 'Select Token' })
        .should('be.visible')
        .should('have.text', 'ETH')
    })

    it('should add ERC20 token correctly', () => {
      // Click on the ETH dropdown (Select token button)
      cy.findByRole('button', { name: 'Select Token' })
        .should('be.visible')
        .should('have.text', 'ETH')
        .click({ scrollBehavior: false })

      // open the Select Token popup
      cy.findByPlaceholderText(/Search by token name/i)
        .should('be.visible')
        .type(ERC20TokenAddressL1, { scrollBehavior: false })
        .then(() => {
          // Click on the Add new token button

          cy.findByRole('button', { name: 'Add New Token' })
            .should('be.visible')
            .click({ scrollBehavior: false })

          // Select the WETH token
          cy.findAllByText('WETH').first().click({ scrollBehavior: false })

          // WETH token should be selected now and popup should be closed after selection
          cy.findByRole('button', { name: 'Select Token' })
            .should('be.visible')
            .should('have.text', 'WETH')
        })
    })

    it('should show ERC20 balance correctly', () => {
      cy.findByText(`Balance: ${l1ERC20bal}`).should('be.visible')
    })
    context("bridge amount is lower than user's L1 ERC20 balance value", () => {
      it('should show summary', () => {
        cy.findByPlaceholderText('Enter amount')
          .type(String(ERC20AmountToSend), { scrollBehavior: false })
          .then(() => {
            cy.findByText('You’re moving')
              .siblings()
              .last()
              .contains(formatAmount(ERC20AmountToSend))
              .should('be.visible')
            cy.findByText('You’ll pay in gas fees')
              .siblings()
              .last()
              .contains(zeroToLessThanOneETH)
              .should('be.visible')
            cy.findByText('L1 gas')
              .parent()
              .siblings()
              .last()
              .contains(zeroToLessThanOneETH)
              .should('be.visible')
            cy.findByText('L2 gas')
              .parent()
              .siblings()
              .last()
              .contains(zeroToLessThanOneETH)
              .should('be.visible')
          })
      })
      it('should deposit successfully', () => {
        cy.findByRole('button', {
          name: 'Move funds to Arbitrum'
        })
          .click({ scrollBehavior: false })
          .then(() => {
            cy.confirmMetamaskTransaction().then(() => {
              cy.findByText(
                `Moving ${formatAmount(ERC20AmountToSend, {
                  symbol: 'WETH'
                })} to Arbitrum...`
              ).should('be.visible')
            })
          })
      })
    })
    // TODO => test for bridge amount higher than user's L1 ERC20 balance
  })

  // TODO
  context('user has some L1-ERC20 and is on L2', () => {})
  // TODO
  context('user has some L1-ERC20 and is on wrong chain', () => {})
  // TODO
  context('user has 0 L1-ERC20 and is on L1', () => {})
  // TODO
  context('user has 0 L1-ERC20 and is on L2', () => {})
  // TODO
  context('user has 0 L1-ERC20 and is on wrong chain', () => {})

  context(
    'user has some ERC-20 tokens which require token approval permission and is on L1',
    () => {
      // log in to metamask before deposit
      before(() => {
        cy.login('L1')
      })
      after(() => {
        // after all assertions are executed, logout and reset the account
        cy.logout()
      })

      it('should add ERC20 token correctly', () => {
        addErc20Token({
          address: unbridgedERC20Token,
          name: 'L1CustomToken',
          symbol: 'LCT'
        })
        cy.findByPlaceholderText('Enter amount')
          .type('0.00012', { scrollBehavior: false })
          .then(() => {
            cy.findByRole('button', {
              name: /Move funds to Arbitrum Goerli/i
            })
              .should('be.visible')
              .should('be.enabled')
              .click({ scrollBehavior: false })
            // New dialog to approve the token
            cy.findByText('New Token Detected').should('be.visible')
            cy.findByRole('button', { name: 'Continue' })
              .should('be.visible')
              .should('be.enabled')
              .click({ scrollBehavior: false })
              .then(() => {
                cy.confirmMetamaskTransaction().then(() => {
                  cy.findByText(
                    `Moving ${formatAmount(0.00012, {
                      symbol: 'LCT'
                    })} to Arbitrum Goerli...`
                  ).should('be.visible')
                })
              })
            // TODO: once we create new wallet per test, uncomment, to also test for token approval
            // Move funds button should now be disabled while the dialog is open
            // cy.findByRole('button', {
            //   name: /Move funds to Arbitrum Goerli/i
            // })
            //   .should('be.visible')
            //   .should('be.disabled')
            // New dialog to approve the fee
            // Pay button is disabled until checkbox is checked
            // cy.findByRole('button', { name: /Pay approval fee of / })
            //   .should('be.visible')
            //   .should('be.disabled')
            // cy.findByRole('button', {
            //   name: /I understand that I have to pay a one-time approval fee of/
            // })
            //   .should('be.visible')
            //   .should('be.enabled')
            //   .click({ scrollBehavior: false })
            // cy.findByRole('button', { name: /Pay approval fee of/ })
            //   .should('be.visible')
            //   .should('be.enabled')
            //   .click({ scrollBehavior: false })
            //   .then(() => {
            //     cy.confirmMetamaskTransaction().then(() => {
            //       cy.findByText(
            //         `Moving ${formatAmount(0.0001, {
            //           symbol: 'LINK'
            //         })} to Arbitrum Goerli...`
            //       ).should('be.visible')
            //     })
            //   })
          })
      })
    }
  )
  // TODO
  context('approve and send ERC-20 successfully', () => {})
})
