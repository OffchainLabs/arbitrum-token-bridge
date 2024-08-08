/**
 * When user wants to bridge ETH from L1 to L2
 */

import {
  getL1NetworkName,
  getL2NetworkName,
  zeroToLessThanOneETH
} from '../../support/common'

describe('Deposit ETH', () => {
  const ETHAmountToDeposit = 0.0001

  const isOrbitTest = Cypress.env('ORBIT_TEST') == '1'
  const depositTime = isOrbitTest ? 'Less than a minute' : '9 minutes'

  // Happy Path
  it('should show L1 and L2 chains correctly', () => {
    cy.login({ networkType: 'parentChain' })
    cy.findSourceChainButton(getL1NetworkName())
    cy.findDestinationChainButton(getL2NetworkName())
  })

  it('should show gas estimations and bridge successfully', () => {
    cy.login({ networkType: 'parentChain' })
    cy.typeAmount(ETHAmountToDeposit)
      //
      .then(() => {
        cy.findGasFeeSummary(zeroToLessThanOneETH)
        cy.findGasFeeForChain(getL1NetworkName(), zeroToLessThanOneETH)
        cy.findGasFeeForChain(getL2NetworkName(), zeroToLessThanOneETH)
      })
    cy.findMoveFundsButton().click()
    cy.confirmMetamaskTransaction().then(() => {
      cy.findTransactionInTransactionHistory({
        duration: depositTime,
        amount: ETHAmountToDeposit,
        symbol: 'ETH'
      })
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
