import {
  ERC20TokenAddressL1,
  ERC20TokenAddressL2,
  invalidTokenAddress,
  resetSeenTimeStampCache
} from '../../support/common'

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
        importTokenThroughUI(ERC20TokenAddressL1)

        // Select the LINK token
        cy.findByText('ChainLink Token').click({ scrollBehavior: false })

        // LINK token should be selected now and popup should be closed after selection
        cy.findByRole('button', { name: 'Select Token' })
          .should('be.visible')
          .should('have.text', 'LINK')
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
        importTokenThroughUI(ERC20TokenAddressL2)

        // Select the LINK token
        cy.findByText('ChainLink Token').click({ scrollBehavior: false })

        // LINK token should be selected now and popup should be closed after selection
        cy.findByRole('button', { name: 'Select Token' })
          .should('be.visible')
          .should('have.text', 'LINK')
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
            token: ERC20TokenAddressL1
          }
        })

        // Modal is displayed
        cy.get('h2')
          .contains(/import unknown token/i)
          .should('be.visible')
        cy.findByText(/ChainLink Token/i).should('be.visible')
        cy.findByText(new RegExp(ERC20TokenAddressL1, 'i')).should('be.visible')

        // Import token
        cy.findByRole('button', { name: 'Import token' })
          .should('be.visible')
          .click({ scrollBehavior: false })
          .then(() => {
            cy.findByRole('button', { name: 'Select Token' })
              .should('be.visible')
              .should('have.text', 'LINK')
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
            token: ERC20TokenAddressL2
          }
        })

        // Modal is displayed
        cy.get('h2')
          .contains(/import unknown token/i)
          .should('be.visible')
        cy.findByText(/ChainLink Token/i).should('be.visible')
        // Modal should always display L1 address regardless of query parameter
        cy.findByText(new RegExp(ERC20TokenAddressL1, 'i')).should('be.visible')

        // Import token
        cy.findByRole('button', { name: 'Import token' })
          .should('be.visible')
          .click({ scrollBehavior: false })
          .then(() => {
            cy.findByRole('button', { name: 'Select Token' })
              .should('be.visible')
              .should('have.text', 'LINK')
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
        cy.findByText(new RegExp(ERC20TokenAddressL1, 'i')).should('not.exist')

        cy.findByRole('button', { name: 'Import token' }).should('not.exist')
        // Close modal
        cy.findByRole('button', { name: 'DialogCancel' })
          .should('be.visible')
          .click({ scrollBehavior: false })
          .then(() => {
            cy.findByRole('button', { name: 'Select Token' })
              .should('be.visible')
              .should('have.text', 'ETH')
          })

        // Modal is closed
        cy.findByRole('button', { name: 'DialogCancel' }).should('not.exist')
      })
    })
  })
})
