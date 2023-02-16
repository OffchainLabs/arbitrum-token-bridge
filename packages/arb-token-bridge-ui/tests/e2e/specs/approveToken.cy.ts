import {
  importTokenThroughUI,
  ERC20TokenName,
  ERC20TokenSymbol,
  zeroToLessThanOneETH
} from '../../support/common'

const ERC20TokenAddressL1 = Cypress.env('ERC20_TOKEN_ADDRESS_L1')

describe('Approve token', () => {
  // log in to metamask
  before(() => {
    cy.login({ networkType: 'L1' })
  })
  after(() => {
    // after all assertions are executed, logout and reset the account
    cy.logout()
  })
  beforeEach(() => {
    cy.restoreAppState()
  })
  afterEach(() => {
    cy.saveAppState()
  })

  context('User approves and deposits ERC-20 token', () => {
    it('should import token through UI', () => {
      importTokenThroughUI(ERC20TokenAddressL1)

      // Select the ERC-20 token
      cy.findByText('Added by User').should('exist')
      cy.findByText(ERC20TokenName).click({ scrollBehavior: false })

      // ERC-20 token should be selected now and popup should be closed after selection
      cy.findByRole('button', { name: 'Select Token' })
        .should('be.visible')
        .should('have.text', ERC20TokenSymbol)
    })

    it('should approve successfully', () => {
      cy.findByPlaceholderText('Enter amount')
        .type('0.000000000001', { scrollBehavior: false })
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
      cy.findByRole('button', {
        name: 'Move funds to Arbitrum'
      })
        .as('transferButton')
        .click({ scrollBehavior: false })
        .then(() => {
          cy.findByText(/I understand that I have to pay a one-time/).click({
            scrollBehavior: false
          })
          cy.findByRole('button', {
            name: /Pay approval fee of/
          }).click({ scrollBehavior: false })
          cy.confirmMetamaskPermissionToSpend()
        })
      cy.get('@transferButton').should('be.disabled')
    })

    it('should deposit successfully', () => {
      // TODO: we don't have any indication in the UI that we are approving a token.
      // We don't have a way to capture the finished approval state.
      // Need better UX.
      cy.log('Approving ERC-20...')
      // eslint-disable-next-line
      cy.wait(15000)
      cy.confirmMetamaskTransaction().then(() => {
        cy.findByText(
          `Moving 0.000000000001 ${ERC20TokenSymbol} to Arbitrum...`
        ).should('be.visible')
      })
    })
  })
})
