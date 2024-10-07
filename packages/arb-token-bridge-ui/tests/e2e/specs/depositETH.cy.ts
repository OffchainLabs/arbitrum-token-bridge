/**
 * When user wants to bridge native token from L1 to L2
 */

import {
  getL1NetworkName,
  getL2NetworkName,
  getZeroToLessThanOneNativeToken
} from '../../support/common'

describe('Deposit native token', () => {
  const ETHAmountToDeposit = 0.0001
  const nativeTokenSymbol = Cypress.env('NATIVE_TOKEN_SYMBOL')
  const zeroToLessThanOneNativeToken =
    getZeroToLessThanOneNativeToken(nativeTokenSymbol)

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
    cy.findGasFeeSummary(zeroToLessThanOneNativeToken)
    cy.findGasFeeForChain(getL1NetworkName(), zeroToLessThanOneNativeToken)
    cy.findGasFeeForChain(getL2NetworkName(), zeroToLessThanOneNativeToken)
    cy.findMoveFundsButton().click()
    cy.confirmMetamaskTransaction()
    cy.findTransactionInTransactionHistory({
      duration: depositTime,
      amount: ETHAmountToDeposit,
      symbol: nativeTokenSymbol
    })
    cy.closeTransactionHistoryPanel()
    cy.findAmountInput().should('have.value', '')
    cy.findMoveFundsButton().should('be.disabled')
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
