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
    cy.findSourceChainButton('Ethereum Local')
    cy.findDestinationChainButton('Arbitrum Local')
  })

  it('should show gas estimations and bridge successfully', () => {
    cy.login({ networkType: 'L1' })
    cy.typeAmount(ETHAmountToDeposit)
      //
      .then(() => {
        cy.findSummaryGasFee(zeroToLessThanOneETH)
        cy.findGasFeeForChain('Ethereum Local', zeroToLessThanOneETH)
        cy.findGasFeeForChain('Arbitrum Local', zeroToLessThanOneETH)
      })
    cy.findMoveFundsButton().click()
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
