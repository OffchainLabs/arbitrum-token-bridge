/**
 * When user wants to bridge ETH from L1 to L2
 */

import {
  getL1NetworkName,
  getL2NetworkName,
  zeroToLessThanOneETH
} from '../../support/common'
import { formatAmount } from '../../../src/util/NumberUtils'

describe('Deposit ETH', () => {
  const ETHAmountToDeposit = 0.0001

  const isOrbitTest = Cypress.env('ORBIT_TEST') == '1'
  const depositTime = isOrbitTest ? 'Less than a minute' : '10 minutes'

  // Happy Path
  it('should show L1 and L2 chains correctly', () => {
    cy.login({ networkType: 'L1' })
    cy.findSourceChainButton(getL1NetworkName())
    cy.findDestinationChainButton(getL2NetworkName())
  })

  it('should show gas estimations and bridge successfully', () => {
    cy.login({ networkType: 'L1' })
    cy.typeAmount(ETHAmountToDeposit)
      //
      .then(() => {
        cy.findByText('You will pay in gas fees:')
          .siblings()
          .last()
          .contains(zeroToLessThanOneETH)
          .should('be.visible')
        cy.findByText(`${getL1NetworkName()} gas fee`)
          .parent()
          .siblings()
          .last()
          .contains(zeroToLessThanOneETH)
          .should('be.visible')
        cy.findByText(`${getL2NetworkName()} gas fee`)
          .parent()
          .siblings()
          .last()
          .contains(zeroToLessThanOneETH)
          .should('be.visible')
      })
    cy.findMoveFundsButton().click()
    cy.confirmMetamaskTransaction().then(() => {
      cy.findByText(depositTime).should('be.visible')
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
