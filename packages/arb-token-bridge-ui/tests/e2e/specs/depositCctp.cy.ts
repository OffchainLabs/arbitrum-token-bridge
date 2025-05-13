/**
 * When user wants to bridge USDC through CCTP from L1 to L2
 */

import { getZeroToLessThanOneToken } from '../../support/common'
import { CommonAddress } from '../../../src/util/CommonAddressUtils'

// common function for this cctp deposit
const confirmAndApproveCctpDeposit = () => {
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
  const USDCAmountToSend = 0.0001
  const zeroToLessThanOneETH = getZeroToLessThanOneToken('ETH')

  beforeEach(() => {
    cy.login({ networkType: 'parentChain', networkName: 'Sepolia' })
    cy.findSourceChainButton('Sepolia')
    cy.findDestinationChainButton('Arbitrum Sepolia')
    cy.findSelectTokenButton('ETH')

    cy.searchAndSelectToken({
      tokenName: 'USDC',
      tokenAddress: CommonAddress.Sepolia.USDC
    })

    cy.typeAmount(USDCAmountToSend)
    cy.findGasFeeSummary('N/A')
  })

  it('should initiate depositing USDC to the same address through CCTP successfully', () => {
    cy.selectRoute('cctp')
    cy.clickMoveFundsButton({ shouldConfirmInMetamask: false })

    confirmAndApproveCctpDeposit()
    cy.confirmSpending(USDCAmountToSend)

    /**
     * Currently synpress cy.confirmMetamaskTransaction doesn't work on Sepolia
     * CCTP flow is tested in withdrawCctp.cy.ts
     */
    // cy.wait(40_000)
    // cy.confirmMetamaskTransaction(undefined)
    // cy.findTransactionInTransactionHistory({
    //   duration: 'a minute',
    //   amount: USDCAmountToSend,
    //   symbol: 'USDC',
    //   options: {
    //     timeout: 60_000
    //   }
    // })

    // We have setup deposit transactions before running tests
    cy.wait(40_000)
    cy.rejectTransaction()
  })

  it('should claim deposit', () => {
    cy.claimCctp(0.00014, { accept: false })
    cy.claimCctp(0.00015, { accept: false })
  })

  /**
   * Because the previous test doesn't send any transaction, allowance is still valid here.
   * Skipping the test for now
   */
  it.skip('should initiate depositing USDC to custom destination address through CCTP successfully', () => {
    cy.fillCustomDestinationAddress()
    cy.selectRoute('cctp')
    cy.clickMoveFundsButton({ shouldConfirmInMetamask: false })
    confirmAndApproveCctpDeposit()

    cy.confirmSpending(USDCAmountToSend)

    cy.wait(40_000)
    cy.confirmTransaction(undefined)
    const txData = { amount: USDCAmountToSend, symbol: 'USDC' }
    cy.wait(15_000)
    cy.findTransactionInTransactionHistory({
      duration: 'a minute',
      ...txData
    })
    cy.openTransactionHistoryDetails(txData)
    cy.findTransactionDetailsCustomDestinationAddress(
      Cypress.env('CUSTOM_DESTINATION_ADDRESS')
    )
  })
})
