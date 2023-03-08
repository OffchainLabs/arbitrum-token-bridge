/**
 * When user wants to bridge ERC20 from L2 to L1
 */

import { formatAmount } from '../../../src/util/NumberUtils'
import { wethTokenAddressL2, zeroToLessThanOneETH } from '../../support/common'

describe('Withdraw ERC20 Token', () => {
  // when all of our tests need to run in a logged-in state
  // we have to make sure we preserve a healthy LocalStorage state
  // because it is cleared between each `it` cypress test
  beforeEach(() => {
    cy.restoreAppState()
  })
  afterEach(() => {
    cy.saveAppState()
  })

  // Happy Path
  context('User is on L2 and imports ERC-20', () => {
    // log in to metamask before withdrawal
    before(() => {
      // login to L2 chain for Local network
      cy.login({ networkType: 'L2', addNewNetwork: false }) // don't add new network, switch to exisiting
    })

    after(() => {
      // after all assertions are executed, logout and reset the account
      cy.logout()
    })

    it('should show form fields correctly', () => {
      cy.findByRole('button', { name: /From: Arbitrum/i }).should('be.visible')
      cy.findByRole('button', { name: /To: Ethereum/i }).should('be.visible')

      cy.findByRole('button', {
        name: /Move funds to Ethereum/i
      })
        .should('be.visible')
        .should('be.disabled')

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
        .type(wethTokenAddressL2, { scrollBehavior: false })
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

    context("bridge amount is lower than user's L2 ERC20 balance value", () => {
      it('should show summary', () => {
        cy.findByPlaceholderText('Enter amount')
          .type('0.0001', { scrollBehavior: false })
          .then(() => {
            cy.findByText('You’re moving')
              .siblings()
              .last()
              .contains(formatAmount(0.0001, { symbol: 'WETH' }))
              .should('be.visible')
            cy.findByText(/You’ll pay in gas/i)
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

      it('should show a clickable withdraw button', () => {
        cy.findByRole('button', {
          name: /Move funds to Ethereum/i
        })
          .should('be.visible')
          .should('be.enabled')
          .click({ scrollBehavior: false })
      })

      it('should show withdraw successfully', () => {
        cy.findByText(/Use Arbitrum’s bridge/i).should('be.visible')

        // the Continue withdrawal button should be disabled at first
        cy.findByRole('button', {
          name: /Continue/i
        }).should('be.disabled')

        cy.findByRole('switch', {
          name: /before I can claim my funds/i
        })
          .should('be.visible')
          .click({ scrollBehavior: false })

        cy.findByRole('switch', {
          name: /after claiming my funds/i
        })
          .should('be.visible')
          .click({ scrollBehavior: false })
          .then(() => {
            // the Continue withdrawal button should not be disabled now
            cy.findByRole('button', {
              name: /Continue/i
            })
              .should('be.enabled')
              .click({ scrollBehavior: false })

            cy.confirmMetamaskTransaction().then(() => {
              cy.findAllByText(
                `Moving ${formatAmount(0.0001, {
                  symbol: 'WETH'
                })} to Ethereum`
              ).should('be.visible')
            })
          })
      })
    })

    // TODO => test for bridge amount higher than user's L2 ERC20 balance
  })

  // TODO - will have both cases:
  // 1. Arbitrum network is not added to metamask yet (add + switch)
  // 2. Arbitrum network already configured in metamask (only switch)
  context('user has some L2-ERC20 and is on L1', () => {})
  // TODO
  context('user has some L2-ERC20 and is on wrong chain', () => {})
  // TODO
  context('user has 0 L2-ERC20 and is on L1', () => {})
  // TODO
  context('user has 0 L2-ERC20 and is on L2', () => {})
  // TODO
  context('user has 0 L2-ERC20 and is on wrong chain', () => {})
  // TODO
  context(
    'user has some LPT tokens which require token approval permission and is on L2',
    () => {}
  )
})
