import {
  invalidTokenAddress,
  resetSeenTimeStampCache
} from '../../support/common'

const ERC20TokenAddress = Cypress.env('CUSTOM_ERC20_TOKEN_ADDRESS')
const ERC20TokenName = 'IntArbTestToken'
const ERC20TokenSymbol = 'IARB'

const importTokenThroughUI = (address: string) => {
  // Click on the ETH dropdown (Select token button)
  cy.findByRole('button', { name: 'Select Token' })
    .should('be.visible')
    .should('have.text', 'ETH')
    .click({ scrollBehavior: false })

  // open the Select Token popup
  return cy
    .findByPlaceholderText(/Search by token name/i)
    .should('be.visible')
    .type(address, { scrollBehavior: false })
    .then(() => {
      // Click on the Add new token button
      cy.findByRole('button', { name: 'Add New Token' })
        .should('be.visible')
        .click({ scrollBehavior: false })
    })
}

describe('Import token', () => {
  context('User import token through UI', () => {
    context('User uses L1 address', () => {
      // log in to metamask
      before(() => {
        cy.login({ networkType: 'L1' })
      })

      after(() => {
        // after all assertions are executed, logout and reset the account
        cy.logout()
      })

      it('should import token through its L1 address', () => {
        importTokenThroughUI(ERC20TokenAddress)

        // Select the ERC-20 token
        cy.findByText('Added by User').should('exist')
        cy.findByText(ERC20TokenName).click({ scrollBehavior: false })

        // ERC-20 token should be selected now and popup should be closed after selection
        cy.findByRole('button', { name: 'Select Token' })
          .should('be.visible')
          .should('have.text', ERC20TokenSymbol)
      })
    })

    context('User uses L2 address', () => {
      // log in to metamask
      before(() => {
        cy.login({ networkType: 'L1' })
      })

      after(() => {
        // after all assertions are executed, logout and reset the account
        cy.logout()
      })

      it('should import token through its L2 address', () => {
        importTokenThroughUI(ERC20TokenAddress)

        // Select the ERC-20 token
        cy.findByText(ERC20TokenName).click({ scrollBehavior: false })

        // ERC-20 token should be selected now and popup should be closed after selection
        cy.findByRole('button', { name: 'Select Token' })
          .should('be.visible')
          .should('have.text', ERC20TokenSymbol)
      })
    })

    context('User uses invalid address', () => {
      // log in to metamask
      before(() => {
        cy.login({ networkType: 'L1' })
      })

      after(() => {
        // after all assertions are executed, logout and reset the account
        cy.logout()
      })

      it('should display an error message', () => {
        importTokenThroughUI(invalidTokenAddress)

        // Error message is displayed
        cy.findByText('Token not found on this network.').should('be.visible')
      })
    })

    context('User uses token symbol', () => {
      // log in to metamask
      before(() => {
        cy.login({ networkType: 'L1' })
        // We don't have the token list locally so we test on Goerli
        cy.changeMetamaskNetwork('mainnet')
      })

      after(() => {
        // after all assertions are executed, logout and reset the account
        cy.logout()
      })

      it('should import token', () => {
        cy.log('start')
        cy.wait(5000)

        cy.findByRole('button', { name: 'Select Token' })
          .should('be.visible')
          .should('have.text', 'ETH')
          .click({ scrollBehavior: false })

        cy.log('Select token clicked')
        cy.wait(5000)

        // Check that token list is imported
        cy.findByRole('button', { name: 'Manage token lists' })
          .scrollIntoView()
          .should('be.visible')
          .click({ scrollBehavior: false })

        cy.log('Manage token list clicked')
        cy.wait(5000)

        cy.findByText('Arbed CMC List').should('be.visible')
        cy.get('[data-cy="toggle Arbed CMC List"]').parent().click({ scrollBehavior: false })

        cy.log('Toggle clicked')
        cy.wait(5000)

        cy.get('[data-cy="toggle Arbed CMC List"]').should('be.checked')

        cy.log('Toggle is checked')
        cy.wait(5000)

        cy.findByRole('button', { name: 'Back to Select Token' })
          .should('be.visible')
          .click({ scrollBehavior: false })

        cy.log('Back button clicked')
        cy.wait(5000)

        // Select the UNI token
        cy.findByPlaceholderText(/Search by token name/i)
          .should('be.visible')
          .type('UNI', { scrollBehavior: false })
        cy.findByText('Uniswap').click({ scrollBehavior: false })

        // UNI token should be selected now and popup should be closed after selection
        cy.findByRole('button', { name: 'Select Token' })
          .should('be.visible')
          .should('have.text', 'UNI')
      })
    })

    context('Add button is grayed', () => {
      // log in to metamask
      before(() => {
        cy.login({ networkType: 'L1' })
      })

      after(() => {
        // after all assertions are executed, logout and reset the account
        cy.logout()
      })

      it('should disable Add button if address is too long/short', () => {
        cy.findByRole('button', { name: 'Select Token' })
          .should('be.visible')
          .should('have.text', 'ETH')
          .click({ scrollBehavior: false })

        // open the Select Token popup
        cy.findByPlaceholderText(/Search by token name/i)
          .as('searchInput')
          .should('be.visible')
          .type(ERC20TokenAddress.slice(0, -1), { scrollBehavior: false })

        // Add button should be disabled
        cy.findByRole('button', { name: 'Add New Token' })
          .should('be.visible')
          .should('be.disabled')
          .as('addButton')

        // Add last character
        cy.get('@searchInput').type(
          `{moveToEnd}${ERC20TokenAddress.slice(-1)}`,
          {
            scrollBehavior: false
          }
        )
        // Add button should be enabled
        cy.get('@addButton').should('be.enabled')

        // Add one more character
        cy.get('@searchInput').type(`{moveToEnd}a`, {
          scrollBehavior: false
        })
        // Add button should be disabled
        cy.get('@addButton').should('be.disabled')
      })
    })
  })

  context('User import token through URL', () => {
    afterEach(() => {
      // after all assertions are executed, logout and reset the account
      cy.logout()
      resetSeenTimeStampCache()
    })

    context('User uses L1 address', () => {
      it('should import token through its L1 address', () => {
        cy.login({
          networkType: 'L1',
          url: '/',
          qs: {
            token: ERC20TokenAddress
          }
        })

        // Modal is displayed
        cy.get('h2')
          .contains(/import unknown token/i)
          .should('be.visible')
        cy.findByText(new RegExp(ERC20TokenName, 'i')).should('be.visible')
        cy.findByText(new RegExp(ERC20TokenAddress, 'i')).should('be.visible')

        // Import token
        cy.findByRole('button', { name: 'Import token' })
          .should('be.visible')
          .click({ scrollBehavior: false })
          .then(() => {
            cy.findByRole('button', { name: 'Select Token' })
              .should('be.visible')
              .should('have.text', ERC20TokenSymbol)
          })

        // Modal is closed
        cy.findByRole('button', { name: 'Import token' }).should('not.exist')
      })
    })

    context('User uses L2 address', () => {
      it('should import token through its L2 address', () => {
        cy.login({
          networkType: 'L1',
          url: '/',
          qs: {
            token: ERC20TokenAddress
          }
        })

        // Modal is displayed
        cy.get('h2')
          .contains(/import unknown token/i)
          .should('be.visible')
        cy.findByText(new RegExp(ERC20TokenName, 'i')).should('be.visible')
        // Modal should always display L1 address regardless of query parameter
        cy.findByText(new RegExp(ERC20TokenAddress, 'i')).should('be.visible')

        // Import token
        cy.findByRole('button', { name: 'Import token' })
          .should('be.visible')
          .click({ scrollBehavior: false })
          .then(() => {
            cy.findByRole('button', { name: 'Select Token' })
              .should('be.visible')
              .should('have.text', ERC20TokenSymbol)
          })

        // Modal is closed
        cy.findByRole('button', { name: 'Import token' }).should('not.exist')
      })
    })

    context('User uses invalid address', () => {
      it('should display an error message', () => {
        cy.login({
          networkType: 'L1',
          url: '/',
          qs: {
            token: invalidTokenAddress
          }
        })

        // Modal is displayed
        cy.get('h2').contains(/invalid token address/i)
        cy.findByText(new RegExp(ERC20TokenAddress, 'i')).should('not.exist')

        cy.findByRole('button', { name: 'Import token' }).should('not.exist')
        // Close modal
        cy.findByRole('button', { name: 'Dialog Cancel' })
          .should('be.visible')
          .click({ scrollBehavior: false })
          .then(() => {
            cy.findByRole('button', { name: 'Select Token' })
              .should('be.visible')
              .should('have.text', 'ETH')
          })

        // Modal is closed
        cy.findByRole('button', { name: 'Dialog Cancel' }).should('not.exist')
      })
    })
  })
})
