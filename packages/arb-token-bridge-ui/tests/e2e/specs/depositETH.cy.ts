/**
 * When user wants to bridge ETH from L1 to L2
 */

import { zeroToLessThanOneETH } from '../../support/common'
import { formatAmount } from '../../../src/util/NumberUtils'

describe('Deposit ETH', () => {
  // when all of our tests need to run in a logged-in state
  // we have to make sure we preserve a healthy LocalStorage state
  // because it is cleared between each `it` cypress test

  const ETHAmountToDeposit = 0.0001

  beforeEach(() => {
    cy.login({ networkType: 'L1' })
  })

  // Happy Path
  it('should show L1 and L2 chains correctly', () => {
    cy.findByRole('button', { name: /From: Ethereum/i }).should('be.visible')
    cy.findByRole('button', { name: /To: Arbitrum/i }).should('be.visible')
  })

  it('should show summary and bridge successfully', () => {
    cy.findByPlaceholderText('Enter amount')
      .typeRecursively(String(ETHAmountToDeposit))
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
    cy.findByRole('button', {
      name: 'Move funds to Arbitrum'
    }).click({ scrollBehavior: false })
    cy.confirmMetamaskTransaction().then(() => {
      cy.findByText(
        `Moving ${formatAmount(0.0001, {
          symbol: 'ETH'
        })} to Arbitrum`
      ).should('be.visible')
    })
  })

  // TODO
  context('user has some ETH and is on L2', () => {})
  // TODO
  context('user has some ETH and is on wrong chain', () => {})
  // TODO
  context('user has 0 ETH and is on L1', () => {})
  // TODO
  context('user has 0 ETH and is on L2', () => {})
  // TODO
  context('user has 0 ETH and is on wrong chain', () => {})
})
