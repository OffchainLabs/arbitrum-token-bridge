import {
  importTokenThroughUI,
  ERC20TokenName,
  ERC20TokenSymbol,
  zeroToLessThanOneETH
} from '../../support/common'

const ERC20TokenAddressL1 = Cypress.env('ERC20_TOKEN_ADDRESS_L1')
const ERC20Amount = '0.000000000001'

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

      cy.findByPlaceholderText('Enter amount')
        .typeRecursively(ERC20Amount)
        .then(() => {
          cy.findByText('You’ll pay in gas fees')
            .siblings()
            .last()
            .contains(zeroToLessThanOneETH)
            .should('be.visible')
          cy.findByText('L1 gas')
            .parent()
            .siblings()
            .last()
            .contains(zeroToLessThanOneETH)
            .should('be.visible')
          cy.findByText('L2 gas')
            .parent()
            .siblings()
            .last()
            .contains(zeroToLessThanOneETH)
            .should('be.visible')
        })
      // first we approve the token
      cy.findByRole('button', { name: 'Approve & Deposit' }).click()
      // approval checkbox
      cy.findByText(/I understand that I have to pay a one-time/).click()
      cy.findByRole('button', {
        name: /Pay approval fee of/
      }).click()
      // metamask approval popup
      cy.confirmMetamaskPermissionToSpend('1').then(() => {
        // make sure it starts to approve
        cy.waitUntil(() => cy.findByRole('button', { name: /Approving/i }))
      })
    })

    context('Deposit token', () => {
      cy.waitUntil(
        () =>
          // this shows when approval has finished
          cy
            .findByRole('button', { name: /Move funds to Arbitrum/i })
            .should('be.visible'),
        {
          errorMsg: 'Approval took too long or failed.',
          // approval can take up to 15 seconds locally, in CI we allow a bit longer
          timeout: 60000,
          interval: 1000
        }
      ).then(() => {
        // now deposit metamask popup will show
        cy.confirmMetamaskTransaction().then(() => {
          // confirm it did deposit
          cy.findByText(
            // PATCH : Find a proper fix later : `0.000000000001` will be rounded to 0 by our formatAmount function in tx cards
            `Moving 0 ${ERC20TokenSymbol} to Arbitrum`
          ).should('be.visible')
        })
      })
    })
  })
})
