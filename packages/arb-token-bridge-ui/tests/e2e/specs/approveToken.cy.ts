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
          cy.findByText("You'll now pay in gas fees")
            .siblings()
            .last()
            .contains(zeroToLessThanOneETH)
            .should('be.visible')
          cy.findByText('Ethereum Local gas')
            .parent()
            .siblings()
            .last()
            .contains(zeroToLessThanOneETH)
            .should('be.visible')
          cy.findByText('Arbitrum Local gas')
            .parent()
            .siblings()
            .last()
            .contains(zeroToLessThanOneETH)
            .should('be.visible')
        })
      cy.findByRole('button', {
        name: 'Move funds to Arbitrum Local'
      }).click()
      cy.findByText(/I understand that I have to pay a one-time/).click()
      cy.findByRole('button', {
        name: /Pay approval fee of/
      }).click()
      cy.confirmMetamaskPermissionToSpend('1')
    })

    context('Deposit token', () => {
      // TODO: we don't have any indication in the UI that we are approving a token.
      // We don't have a way to capture the finished approval state.
      // Need better UX.
      cy.log('Approving ERC-20...')
      // eslint-disable-next-line
      cy.wait(15000)
      cy.confirmMetamaskTransaction().then(() => {
        cy.findByText(
          // PATCH : Find a proper fix later : `0.000000000001` will be rounded to 0 by our formatAmount function in tx cards
          `< 0.00001 ${ERC20TokenSymbol}`
        ).should('be.visible')
      })
    })
  })
})
