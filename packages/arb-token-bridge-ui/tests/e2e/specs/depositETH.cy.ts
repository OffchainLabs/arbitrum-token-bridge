/**
 * When user wants to bridge ETH from L1 to L2
 */

import { zeroToLessThanOneETH } from '../../support/common'
import { formatAmount } from '../../../src/util/NumberUtils'

describe('Deposit ETH', () => {
  const ETHAmountToDeposit = 0.0001

  // Happy Path
  it('should show L1 and L2 chains correctly', () => {
    cy.login({ networkType: 'L1' })
    cy.findByRole('button', { name: /From: Ethereum/i }).should('be.visible')
    cy.findByRole('button', { name: /To: Arbitrum/i }).should('be.visible')
  })

  it('should show gas estimations and bridge successfully', () => {
    cy.login({ networkType: 'L1' })
    cy.findByPlaceholderText('Enter amount')
      .typeRecursively(String(ETHAmountToDeposit))
      .then(() => {
        cy.findByText('You will pay in gas fees:')
          .siblings()
          .last()
          .contains(zeroToLessThanOneETH)
          .should('be.visible')
        cy.findByText('Ethereum Local gas fee')
          .parent()
          .siblings()
          .last()
          .contains(zeroToLessThanOneETH)
          .should('be.visible')
        cy.findByText('Arbitrum Local gas fee')
          .parent()
          .siblings()
          .last()
          .contains(zeroToLessThanOneETH)
          .should('be.visible')
      })
    cy.findByRole('button', {
      name: 'Move funds to Arbitrum Local'
    }).click()
    cy.confirmMetamaskTransaction().then(() => {
      cy.findByText('10 minutes').should('be.visible')
      cy.findByText(
        `${formatAmount(ETHAmountToDeposit, {
          symbol: 'ETH'
        })}`
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
