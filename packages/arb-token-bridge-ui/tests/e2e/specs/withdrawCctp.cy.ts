/**
 * When user wants to bridge USDC through CCTP from L2 to L1
 */

import { CommonAddress } from 'packages/arb-token-bridge-ui/src/util/CommonAddressUtils'

// common function for this cctp withdrawal
export const confirmAndApproveCctpWithdrawal = () => {
  cy.findByRole('tab', {
    name: 'Native USDC',
    selected: true
  }).should('exist')
  cy.findByRole('tab', {
    name: 'Native USDC (Third Party Bridge)',
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

describe('Withdraw USDC through CCTP', () => {
  // Happy Path
  const USDCAmountToSend = 0.0001

  beforeEach(() => {
    cy.login({ networkType: 'childChain', networkName: 'arbitrum-sepolia' })
    cy.findSourceChainButton('Arbitrum Sepolia')
    cy.findDestinationChainButton('Sepolia')
    cy.findSelectTokenButton('ETH')

    cy.searchAndSelectToken({
      tokenName: 'USDC',
      tokenAddress: CommonAddress.ArbitrumSepolia.USDC
    })

    cy.typeAmount(USDCAmountToSend)

    cy.findByText('Gas estimates are not available for this action.').should(
      'be.visible'
    )
    cy.findGasFeeForChain(/You'll have to pay Sepolia gas fee upon claiming./i)
  })

  it('should initiate withdrawing USDC to the same address through CCTP successfully', () => {
    cy.findMoveFundsButton().click()

    confirmAndApproveCctpWithdrawal()
    cy.confirmSpending(USDCAmountToSend.toString())
    // eslint-disable-next-line
    cy.wait(40_000)
    cy.confirmMetamaskTransaction(undefined)
    cy.findTransactionInTransactionHistory({
      amount: USDCAmountToSend,
      symbol: 'USDC'
    })
  })

  it('should initiate withdrawing USDC to custom destination address through CCTP successfully', () => {
    cy.fillCustomDestinationAddress()
    cy.findMoveFundsButton().click()

    confirmAndApproveCctpWithdrawal()
    cy.confirmSpending(USDCAmountToSend.toString())

    // eslint-disable-next-line
    cy.wait(10_000)
    cy.confirmMetamaskTransaction(undefined)
    const txData = {
      amount: USDCAmountToSend,
      symbol: 'USDC'
    }
    cy.findTransactionInTransactionHistory({
      duration: 'Less than a minute',
      ...txData
    })
    cy.openTransactionDetails(txData)
    cy.findTransactionDetailsCustomDestinationAddress(
      Cypress.env('CUSTOM_DESTINATION_ADDRESS')
    )
  })
})
