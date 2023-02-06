/**
 * When user wants to bridge ETH from L2 to L1
 */

import {
  zeroToLessThanOneETH,
  resetSeenTimeStampCache
} from '../../support/common'
import { formatAmount } from '../../../src/util/NumberUtils'

describe('Withdraw ETH', () => {
  // when all of our tests need to run in a logged-in state
  // we have to make sure we preserve a healthy LocalStorage state
  // because it is cleared between each `it` cypress test
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
  context('user has some ETH and is on L2', () => {
    // log in to metamask before withdrawal
    before(() => {
      // login to L2 chain for Arb Goerli network
      cy.login({ networkType: 'L2', addNewNetwork: true }) // add new L2 network
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
    })

    context("bridge amount is lower than user's L2 ETH balance value", () => {
      it('should show summary', () => {
        cy.findByPlaceholderText('Enter amount')
          .type('0.0001', { scrollBehavior: false })
          .then(() => {
            cy.findByText('You’re moving')
              .siblings()
              .last()
              .contains(formatAmount(0.0001, { symbol: 'ETH' }))
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
            cy.findByText('Total amount')
              .siblings()
              .last()
              .contains(/(\d*)(\.\d+)*( ETH)/)
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

      it('should show withdrawal confirmation', () => {
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
          })
      })

      it('should withdraw successfully', () => {
        cy.confirmMetamaskTransaction().then(() => {
          cy.findAllByText(
            `Moving ${formatAmount(0.0001, { symbol: 'ETH' })} to Ethereum...`
          ).should('be.visible')
        })
      })
    })

    // TODO => test for bridge amount higher than user's L2 ETH balance
  })

  // TODO - will have both cases:
  // 1. Arbitrum network is not added to metamask yet (add + switch)
  // 2. Arbitrum network already configured in metamask (only switch)
  context('user has some ETH and is on L1', () => {})
  // TODO
  context('user has some ETH and is on wrong chain', () => {})
  // TODO
  context('user has 0 ETH and is on L1', () => {})
  // TODO
  context('user has 0 ETH and is on L2', () => {})
  // TODO
  context('user has 0 ETH and is on wrong chain', () => {})
})
