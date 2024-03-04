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
          cy.findByText('You will pay in gas fees:')
            .siblings()
            .contains(zeroToLessThanOneETH)
            .should('be.visible')
          cy.findByText('Ethereum Local gas fee')
            .parent()
            .siblings()
            .contains(zeroToLessThanOneETH)
            .should('be.visible')
          cy.findByText('Arbitrum Local gas fee')
            .parent()
            .siblings()
            .contains(zeroToLessThanOneETH)
            .should('be.visible')
        })
      cy.waitUntil(
        () =>
          cy
            .findByRole('button', { name: /Move funds to Arbitrum Local/i })
            .should('not.be.disabled'),
        {
          errorMsg: '/Move funds to Arbitrum Local/ button is disabled',
          timeout: 50000,
          interval: 500
        }
      ).then(() => {
        cy.findByRole('button', {
          name: 'Move funds to Arbitrum Local'
        })
          .scrollIntoView()
          .click()
      })
      cy.findByText(/pay a one-time approval fee/).click()
      cy.findByRole('button', {
        name: /Pay approval fee of/
      }).click()
      cy.confirmMetamaskPermissionToSpend('1')
    })
  })
})
