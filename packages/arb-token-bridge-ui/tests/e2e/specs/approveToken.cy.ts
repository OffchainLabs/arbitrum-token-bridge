import {
  importTokenThroughUI,
  ERC20TokenName,
  ERC20TokenSymbol,
  zeroToLessThanOneETH
} from '../../support/common'

const ERC20TokenAddressL1 = Cypress.env('ERC20_TOKEN_ADDRESS_L1')

describe('Approve token and deposit afterwards', () => {
  // log in to metamask

  it('should approve and deposit ERC-20 token', () => {
    context('Approve token', () => {
      cy.login({ networkType: 'L1' })
      importTokenThroughUI(ERC20TokenAddressL1)

      // Select the ERC-20 token
      cy.findByText('Added by User').should('exist')
      cy.findByText(ERC20TokenName).click()

      // ERC-20 token should be selected now and popup should be closed after selection
      cy.findByRole('button', { name: 'Select Token' })
        .should('be.visible')
        .should('have.text', ERC20TokenSymbol)

      cy.findByText('MAX')
        .click()
        .then(() => {
          cy.findSummaryGasFee(zeroToLessThanOneETH)
          cy.findGasFeeForChain('Ethereum Local', zeroToLessThanOneETH)
          cy.findGasFeeForChain('Arbitrum Local', zeroToLessThanOneETH)
        })
      cy.waitUntil(() => cy.findMoveFundsButton().should('not.be.disabled'), {
        errorMsg: 'move funds button is disabled (expected to be enabled)',
        timeout: 50000,
        interval: 500
      }).then(() => cy.findMoveFundsButton().click())
      cy.findByText(/pay a one-time approval fee/).click()
      cy.findByRole('button', {
        name: /Pay approval fee of/
      }).click()
      cy.confirmMetamaskPermissionToSpend('1')
    })
  })
})
