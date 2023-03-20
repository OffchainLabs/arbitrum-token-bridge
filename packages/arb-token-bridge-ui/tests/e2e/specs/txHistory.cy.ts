import { startWebApp } from '../../support/common'

const DEPOSIT_ROW_IDENTIFIER = /deposit-row-*/i
const DEPOSIT_SEARCH_IDENTIFIER = /Search for a full or partial L1 tx ID/i
const WITHDRAWAL_ROW_IDENTIFIER = /withdrawal-row-*/i
const WITHDRAWAL_SEARCH_IDENTIFIER = /Search for a full or partial L2 tx ID/i

describe('Transaction History', () => {
  before(() => {
    cy.changeMetamaskNetwork('goerli')
    startWebApp()
  })

  after(() => {
    cy.logout()
  })

  // Open tx history panel
  it('should open transactions history panel', () => {
    cy.openTransactionsPanel()
    cy.findByText('Transaction History').should('be.visible')
  })

  // Test deposits are loading
  it('should load deposits', () => {
    cy.findByRole('tab', { name: 'show deposit transactions' })
      .should('be.visible')
      .click()
      .should('have.class', 'selected')

    cy.findAllByTestId(DEPOSIT_ROW_IDENTIFIER).should('have.length.above', 0)
  })

  // Test deposits pagination works
  it('should paginate deposits', () => {
    // check that initially previous button should be disabled
    cy.findByRole('button', { name: /load previous deposits/i })
      .should('be.visible')
      .should('be.disabled')

    // go to next page
    cy.findByRole('button', { name: /load next deposits/i })
      .should('be.visible')
      .should('not.be.disabled')
      .click()
    cy.findByText(/page 2/i).should('be.visible')
    cy.findAllByTestId(DEPOSIT_ROW_IDENTIFIER).should('have.length.above', 0)

    // go to prev page
    cy.findByRole('button', { name: /load previous deposits/i })
      .should('be.visible')
      .should('not.be.disabled')
      .click()
    cy.findByText(/page 1/i).should('be.visible')
    cy.findAllByTestId(DEPOSIT_ROW_IDENTIFIER).should('have.length.above', 0)
  })

  // Test deposits search works
  it('should search deposits', () => {
    // search for valid address substring
    cy.findByPlaceholderText(DEPOSIT_SEARCH_IDENTIFIER)
      .type('0x', { scrollBehavior: false })
      .then(() => {
        // wait for loader to appear before results
        cy.wait(2000)

        // search results
        cy.findAllByTestId(DEPOSIT_ROW_IDENTIFIER).should(
          'have.length.above',
          0
        )
      })

    // search for invalid address substring
    cy.findByPlaceholderText(DEPOSIT_SEARCH_IDENTIFIER)
      .clear()
      .type('invalidTransactionHash', { scrollBehavior: false })
      .then(() => {
        cy.findByText(
          /Oops! Looks like nothing matched your search query/i
        ).should('be.visible')
        cy.findByPlaceholderText(DEPOSIT_SEARCH_IDENTIFIER).clear()
      })
  })

  // Test deposits withdrawal loading
  it('should load withdrawals', () => {
    cy.findByRole('tab', { name: 'show withdrawal transactions' })
      .should('be.visible')
      .click()
      .should('have.class', 'selected')

    cy.findAllByTestId(WITHDRAWAL_ROW_IDENTIFIER).should('have.length.above', 0)
  })

  // Test withdrawal pagination works
  it('should paginate withdrawals', () => {
    // check that initially previous button should be disabled
    cy.findByRole('button', { name: /load previous withdrawals/i })
      .should('be.visible')
      .should('be.disabled')

    // go to next page
    cy.findByRole('button', { name: /load next withdrawals/i })
      .should('be.visible')
      .should('not.be.disabled')
      .click()
    cy.findByText(/page 2/i).should('be.visible')
    cy.findAllByTestId(WITHDRAWAL_ROW_IDENTIFIER).should('have.length.above', 0)

    // go to prev page
    cy.findByRole('button', { name: /load previous withdrawals/i })
      .should('be.visible')
      .should('not.be.disabled')
      .click()
    cy.findByText(/page 1/i).should('be.visible')
    cy.findAllByTestId(WITHDRAWAL_ROW_IDENTIFIER).should('have.length.above', 0)
  })

  // Test withdrawal search works
  it('should search withdrawals', () => {
    // search for valid address substring
    cy.findByPlaceholderText(WITHDRAWAL_SEARCH_IDENTIFIER)
      .type('0x', { scrollBehavior: false })
      .then(() => {
        // wait for loader to appear before results
        cy.wait(2000)

        // search results
        cy.findAllByTestId(WITHDRAWAL_ROW_IDENTIFIER).should(
          'have.length.above',
          0
        )
      })

    // search for invalid address substring
    cy.findByPlaceholderText(WITHDRAWAL_SEARCH_IDENTIFIER)
      .clear()
      .type('invalidTransactionHash', { scrollBehavior: false })
      .then(() => {
        cy.findByText(
          /Oops! Looks like nothing matched your search query/i
        ).should('be.visible')
        cy.findByPlaceholderText(WITHDRAWAL_SEARCH_IDENTIFIER).clear()
      })
  })
})
