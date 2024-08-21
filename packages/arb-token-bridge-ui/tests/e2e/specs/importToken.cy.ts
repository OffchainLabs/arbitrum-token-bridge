import {
  getInitialETHBalance,
  invalidTokenAddress,
  ERC20TokenName,
  ERC20TokenSymbol,
  importTokenThroughUI,
  visitAfterSomeDelay
} from '../../support/common'

const ERC20TokenAddressL1: string = Cypress.env(
  'ERC20_TOKEN_ADDRESS_PARENT_CHAIN'
)
const ERC20TokenAddressL2: string = Cypress.env(
  'ERC20_TOKEN_ADDRESS_CHILD_CHAIN'
)

describe('Import token', () => {
  // we use mainnet to test token lists

  context('User import token through UI', () => {
    before(() => {
      getInitialETHBalance(
        `https://mainnet.infura.io/v3/${Cypress.env('INFURA_KEY')}`,
        Cypress.env('ADDRESS')
      )
    })
    context('User uses L1 address', () => {
      it('should import token through its L1 address', () => {
        cy.login({ networkType: 'parentChain' })
        importTokenThroughUI(ERC20TokenAddressL1)

        // Select the ERC-20 token
        cy.findByText('Added by User').should('exist')
        // trigger instead of click due to an unclear issue in CI
        // however most likely due to a slow container and the metamask window overlapping the button
        // same on all the other cases
        cy.findByText(ERC20TokenName).trigger('click', {
          force: true
        })

        // ERC-20 token should be selected now and popup should be closed after selection
        cy.findSelectTokenButton(ERC20TokenSymbol)
      })
    })

    context('User uses L2 address', () => {
      it('should import token through its L2 address', () => {
        cy.login({ networkType: 'parentChain' })
        importTokenThroughUI(ERC20TokenAddressL2)

        // Select the ERC-20 token
        cy.findByText(ERC20TokenName).trigger('click', {
          force: true
        })

        // ERC-20 token should be selected now and popup should be closed after selection
        cy.findSelectTokenButton(ERC20TokenSymbol)
      })
    })

    context('User uses invalid address', () => {
      it('should display an error message after invalid input', () => {
        cy.login({ networkType: 'parentChain' })
        importTokenThroughUI(invalidTokenAddress)

        // Error message is displayed
        cy.findByText('Token not found on this network.').should('be.visible')
      })
    })

    context('User clicks token list toggle', () => {
      it('should toggle token list', () => {
        // we don't have the token list locally so we test on mainnet
        cy.login({
          networkType: 'parentChain',
          networkName: 'mainnet'
        })

        cy.findSelectTokenButton('ETH').click()

        // Check that token list is imported
        cy.findByRole('button', { name: 'Manage token lists' })
          .scrollIntoView()
          .should('be.visible')
          .click()

        cy.findByText('Arbed CMC List').scrollIntoView().should('be.visible')
        cy.findByLabelText('Arbed CMC List').click()
        cy.findByRole('switch', {
          name: /Arbed CMC List toggle/
        }).should('have.attr', 'aria-checked', 'true')
      })
    })

    context('User uses token symbol', () => {
      it('should import token', () => {
        // we don't have the token list locally so we test on mainnet
        cy.login({
          networkType: 'parentChain',
          networkName: 'mainnet'
        })

        cy.findSelectTokenButton('ETH').click()

        // Check that token list is imported
        cy.findByRole('button', { name: 'Manage token lists' })
          .scrollIntoView()
          .should('be.visible')
          .click()

        cy.findByText('Arbed CMC List').scrollIntoView().should('be.visible')
        cy.findByLabelText('Arbed CMC List').click()
        cy.findByRole('switch', {
          name: /Arbed CMC List toggle/
        }).should('have.attr', 'aria-checked', 'true')

        cy.findByRole('button', { name: /Back to Select Token/ })
          .should('be.visible')
          .click()

        // Select the UNI token
        cy.findByPlaceholderText(/Search by token name/i)
          .should('be.visible')
          .typeRecursively('UNI')

        // flaky test can load data too slowly here
        cy.findByText('Uniswap', { timeout: 5_000 }).click()

        // UNI token should be selected now and popup should be closed after selection
        cy.findSelectTokenButton('UNI')
      })
    })

    context('Add button is grayed', () => {
      it('should disable Add button if address is too long/short', () => {
        const moveToEnd = ERC20TokenAddressL1.substring(
          0,
          ERC20TokenAddressL1.length - 1
        )

        cy.login({ networkType: 'parentChain' })
        cy.findSelectTokenButton('ETH').click()

        // open the Select Token popup
        cy.findByPlaceholderText(/Search by token name/i)
          .as('searchInput')
          .should('be.visible')
          .typeRecursively(ERC20TokenAddressL1.slice(0, -1))

        // Add button should be disabled
        cy.findByRole('button', { name: 'Add New Token' })
          .should('be.visible')
          .should('be.disabled')
          .as('addButton')

        // Add last character
        cy.get('@searchInput').typeRecursively(
          `${moveToEnd}${ERC20TokenAddressL1.slice(-1)}`
        )
        // Add button should be enabled
        cy.get('@addButton').should('be.enabled')

        // Add one more character to make the address invalid
        cy.get('@searchInput').typeRecursively(`${moveToEnd}x`)
        // Add button should be disabled
        cy.get('@addButton').should('be.disabled')
      })
    })
  })

  context('User import token through URL', () => {
    context('User uses L1 address', () => {
      it('should import token through URL using its L1 address', () => {
        cy.login({
          networkType: 'parentChain',
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
          .trigger('click', {
            force: true
          })
        cy.findSelectTokenButton(ERC20TokenSymbol)

        // Modal is closed
        cy.findByRole('button', { name: 'Import token' }).should('not.exist')
      })
    })

    context('User uses L2 address', () => {
      it('should import token through URL using its L2 address', () => {
        cy.login({
          networkType: 'parentChain',
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
          .trigger('click', {
            force: true
          })
        cy.findSelectTokenButton(ERC20TokenSymbol)

        // Modal is closed
        cy.findByRole('button', { name: 'Import token' }).should('not.exist')
      })
    })

    context('User uses invalid address', () => {
      it('should display an error message after invalid URL', () => {
        cy.login({
          networkType: 'parentChain',
          url: '/',
          query: {
            token: invalidTokenAddress
          }
        })

        visitAfterSomeDelay('/', {
          qs: {
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
          .trigger('click', {
            force: true
          })
        cy.findSelectTokenButton('ETH')

        // Modal is closed
        cy.findByRole('button', { name: 'Dialog Cancel' }).should('not.exist')
      })
    })
  })
})
