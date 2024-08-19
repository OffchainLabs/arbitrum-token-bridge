/**
 * When user wants to bridge USDC through CCTP from L1 to L2
 */

import { zeroToLessThanOneETH } from '../../support/common'
import { CommonAddress } from '../../../src/util/CommonAddressUtils'

// common function for this cctp deposit
const confirmAndApproveCctpDeposit = () => {
  cy.findByRole('tab', {
    name: 'Native USDC',
    selected: true
  }).should('exist')
  cy.findByRole('tab', {
    name: 'Native USDC (Third Party Bridge)',
    selected: false
  }).should('exist')
  cy.findByRole('tab', {
    name: 'Wrapped USDC (USDC.e)',
    selected: false
  }).should('exist')

  // By default, confirm button is disabled
  cy.findByRole('button', {
    name: /Continue/i
  })
    .should('be.visible')
    .should('be.disabled')

  // Checkbox
  cy.findByRole('switch', {
    name: /I understand that I'll have to send/i
  })
    .should('be.visible')
    .click()
  cy.findByRole('switch', {
    name: /I understand that it will take/i
  })
    .should('be.visible')
    .click()

  cy.findByRole('switch', {
    name: /I understand USDC.e/i
  })
    .should('be.visible')
    .click()

  cy.findByRole('button', {
    name: /Continue/i
  })
    .should('be.visible')
    .should('be.enabled')
    .click()

  cy.findByText(/I understand that I have to/)
    .should('be.visible')
    .click()
  cy.findByRole('button', {
    name: /Pay approval fee of/
  }).click()
  cy.log('Approving USDC...')
}

describe('Deposit USDC through CCTP', () => {
  // Happy Path
  let USDCAmountToSend = 0.0001

  beforeEach(() => {
    cy.login({ networkType: 'parentChain', networkName: 'sepolia' })
    cy.findSourceChainButton('Sepolia')
    cy.findDestinationChainButton('Arbitrum Sepolia')
    cy.findSelectTokenButton('ETH')

    cy.searchAndSelectToken({
      tokenName: 'USDC',
      tokenAddress: CommonAddress.Sepolia.USDC
    })

    cy.findByPlaceholderText(/enter amount/i).type(String(USDCAmountToSend))
    cy.findGasFeeSummary(zeroToLessThanOneETH)
    cy.findGasFeeForChain('Sepolia', zeroToLessThanOneETH)
    cy.findGasFeeForChain(
      /You'll have to pay Arbitrum Sepolia gas fee upon claiming./i
    )
  })

  it('should initiate depositing USDC to the same address through CCTP successfully', () => {
    cy.findMoveFundsButton().click()

    confirmAndApproveCctpDeposit()
    cy.confirmSpending({
      shouldWaitForPopupClosure: true
    })

    // eslint-disable-next-line
    cy.wait(40_000)
    cy.confirmMetamaskTransaction(undefined)
    cy.findTransactionInTransactionHistory({
      duration: 'a minute',
      amount: USDCAmountToSend,
      symbol: 'USDC'
    })
  })

  it('should initiate depositing USDC to custom destination address through CCTP successfully', () => {
    cy.fillCustomDestinationAddress()
    cy.findMoveFundsButton().click()
    confirmAndApproveCctpDeposit()

    cy.confirmSpending({
      shouldWaitForPopupClosure: true
    })

    // eslint-disable-next-line
    cy.wait(40_000)
    cy.confirmMetamaskTransaction(undefined)
    const txData = { amount: USDCAmountToSend, symbol: 'USDC' }
    cy.findTransactionInTransactionHistory({
      duration: 'a minute',
      ...txData
    })
    cy.openTransactionDetails(txData)
    cy.findTransactionDetailsCustomDestinationAddress(
      Cypress.env('CUSTOM_DESTINATION_ADDRESS')
    )
  })
})
