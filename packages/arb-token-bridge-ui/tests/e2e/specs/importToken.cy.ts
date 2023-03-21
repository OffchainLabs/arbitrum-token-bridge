import { utils } from 'ethers'
import {
  getInitialETHBalance,
  invalidTokenAddress,
  ERC20TokenName,
  ERC20TokenSymbol,
  importTokenThroughUI
} from '../../support/common'

const ERC20TokenAddressL1 = Cypress.env('ERC20_TOKEN_ADDRESS_L1')
const ERC20TokenAddressL2 = Cypress.env('ERC20_TOKEN_ADDRESS_L2')

describe('Import token', () => {
  // we use mainnet to test token lists
  // need low balance check to bypass a mainnet popup
  let isLowBalanceMainnet: boolean

  context('User import token through UI', () => {
    before(() => {
      getInitialETHBalance(
        `https://mainnet.infura.io/v3/${Cypress.env('INFURA_KEY')}`,
        Cypress.env('ADDRESS')
      ).then(val => (isLowBalanceMainnet = val.lte(utils.parseEther('0.005'))))
    })
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
        importTokenThroughUI(ERC20TokenAddressL2)

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

      it('should display an error message after invalid input', () => {
        importTokenThroughUI(invalidTokenAddress)

        // Error message is displayed
        cy.findByText('Token not found on this network.').should('be.visible')
      })
    })

    context('User uses token symbol', () => {
      // log in to metamask
      before(() => {
        cy.login({ networkType: 'L1' })
        // we don't have the token list locally so we test on mainnet
        cy.changeMetamaskNetwork('mainnet')

        // click low balance pop up if shown
        if (isLowBalanceMainnet) {
          cy.findByText('Go to bridge')
            .should('be.visible')
            .click({ scrollBehavior: false })
        }
      })

      after(() => {
        // after all assertions are executed, logout and reset the account
        cy.logout()
      })

      it('should import token', () => {
        cy.findByRole('button', { name: 'Select Token' })
          .should('be.visible')
          .should('have.text', 'ETH')
          .click({ scrollBehavior: false })

        // Check that token list is imported
        cy.findByRole('button', { name: 'Manage token lists' })
          .scrollIntoView()
          .should('be.visible')
          .click({ scrollBehavior: false })

        cy.findByText('Arbed CMC List').should('be.visible')
        cy.findByLabelText('Arbed CMC List')
          .as('tokenListToggle')
          .parent()
          .click({ scrollBehavior: false })
        cy.get('@tokenListToggle').should('be.checked')

        cy.findByRole('button', { name: 'Back to Select Token' })
          .should('be.visible')
          .click({ scrollBehavior: false })

        // Select the UNI token
        cy.findByPlaceholderText(/Search by token name/i)
          .should('be.visible')
          .type('UNI', { scrollBehavior: false })

        cy.get('.tokenSearchList')
          .first()
          .within(() => {
            // cy.get() will only search for elements within .tokenSearchList,
            // not within the entire document, fixing the multiple Uniswap text issue
            cy.findByText('Uniswap').click({ scrollBehavior: false })
          })

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
          .type(ERC20TokenAddressL1.slice(0, -1), { scrollBehavior: false })

        // Add button should be disabled
        cy.findByRole('button', { name: 'Add New Token' })
          .should('be.visible')
          .should('be.disabled')
          .as('addButton')

        // Add last character
        cy.get('@searchInput').type(
          `{moveToEnd}${ERC20TokenAddressL1.slice(-1)}`,
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
      // after all assertions are executed, logout the account
      cy.logout()
    })

    context('User uses L1 address', () => {
      it('should import token through URL using its L1 address', () => {
        cy.login({
          networkType: 'L1',
          url: '/',
          query: {
            token: ERC20TokenAddressL1
          }
        })

        // waiting for metamask notification to disappear
        // eslint-disable-next-line
        cy.wait(3000)

        // Modal is displayed
        cy.get('h2')
          .contains(/import unknown token/i)
          .should('be.visible')
        cy.findByText(new RegExp(ERC20TokenName, 'i')).should('be.visible')
        cy.findByText(new RegExp(ERC20TokenAddressL1, 'i')).should('be.visible')

        // Import token
        cy.findByRole('button', { name: 'Import token' })
          .should('be.visible')
          .click({ scrollBehavior: false })
          .then(() => {
            cy.findByRole('button', { name: 'Select Token' })
              .should('be.visible')
              .should('have.text', ERC20TokenSymbol)

            // Modal is closed
            cy.findByRole('button', { name: 'Import token' }).should(
              'not.exist'
            )
          })
      })
    })

    context('User uses L2 address', () => {
      it('should import token through URL using its L2 address', () => {
        cy.login({
          networkType: 'L1',
          url: '/',
          query: {
            token: ERC20TokenAddressL2
          }
        })

        // waiting for metamask notification to disappear
        // eslint-disable-next-line
        cy.wait(3000)

        // Modal is displayed
        cy.get('h2')
          .contains(/import unknown token/i)
          .should('be.visible')
        cy.findByText(new RegExp(ERC20TokenName, 'i')).should('be.visible')
        // Modal should always display L1 address regardless of query parameter
        cy.findByText(new RegExp(ERC20TokenAddressL1, 'i')).should('be.visible')

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
      it('should display an error message after invalid URL', () => {
        cy.login({
          networkType: 'L1',
          url: '/',
          query: {
            token: invalidTokenAddress
          }
        })

        // Modal is displayed
        cy.get('h2').contains(/invalid token address/i)
        cy.findByText(new RegExp(ERC20TokenAddressL1, 'i')).should('not.exist')

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
