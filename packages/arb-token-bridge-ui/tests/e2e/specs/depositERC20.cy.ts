/**
 * When user wants to bridge ERC20 from L1 to L2
 */

import { formatAmount } from '../../../src/util/NumberUtils'
import {
  getInitialERC20Balance,
  ethRpcUrl,
  l1NetworkConfig,
  zeroToLessThanOneETH,
  resetSeenTimeStampCache,
  ERC20TokenAddressL1,
  ERC20TokenSymbol
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
            symbol: ERC20TokenSymbol
          }))
      )
      cy.login({ networkType: 'L1', addNewNetwork: true })
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

          // Select the ERC20 token
          cy.findByText(ERC20TokenSymbol).click({ scrollBehavior: false })

          // ERC20 token should be selected now and popup should be closed after selection
          cy.findByRole('button', { name: 'Select Token' })
            .should('be.visible')
            .should('have.text', ERC20TokenSymbol)
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

      it('should approve successfully', () => {
        cy.findByRole('button', {
          name: 'Move funds to Arbitrum'
        })
          .as('@transferButton')
          .click({ scrollBehavior: false })
          .then(() => {
            cy.confirmMetamaskPermissionToSpend()
          })
        cy.get('@transferButton').should('be.disabled')
      })

      it('should deposit successfully', () => {
        cy.findByRole('button', {
          name: 'Move funds to Arbitrum'
        })
          .should('not.be.disabled')
          .as('transferButton')
        cy.get('@transferButton')
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
  // TODO
  context(
    'user has some ERC-20 tokens which require token approval permission and is on L1',
    () => {}
  )
  // TODO
  context('approve and send ERC-20 successfully', () => {})
})
