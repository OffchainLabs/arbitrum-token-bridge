// DONE 0. Connect to goerli and not local-network
// DONE 1. Open tx history panel
// DONE 2. Test deposits are loading
// DONE 3. Test deposits search works
// DONE 4. Test deposits pagination works
// DONE 5. Test withdrawals are loading
// DONE 6. Test withdrawals search works
// DONE 7. Test withdrawals pagination works
// DONE 8. Test pending transactions works
// 9. Testing all possible row states - mock the API for deposit + withdrawal

import { startWebApp } from '../../support/common'

const DEPOSIT_ROW_IDENTIFIER = /deposit-row-*/i
const DEPOSIT_SEARCH_IDENTIFIER = /Search for a full or partial L1 tx ID/i
const WITHDRAWAL_ROW_IDENTIFIER = /withdrawal-row-*/i
const WITHDRAWAL_SEARCH_IDENTIFIER = /Search for a full or partial L2 tx ID/i

describe('Transaction History', () => {
  before(() => {
    cy.clearLocalStorage()
    cy.importMetamaskAccount(
      'adb330a1f8aae08885e6cf6ecf97817b1808ed96473214ca58f8276abc505beb'
    )
    cy.switchMetamaskAccount(3)
    cy.changeMetamaskNetwork('goerli')
    startWebApp()
  })

  it('should open transactions history panel', () => {
    cy.openTransactionsPanel()
    cy.findByText('Transaction History').should('be.visible')
  })

  it('should load deposits', () => {
    cy.findByRole('tab', { name: 'show deposit transactions' })
      .should('be.visible')
      .click()
      .should('have.class', 'selected')

    cy.findAllByTestId(DEPOSIT_ROW_IDENTIFIER).should('have.length.above', 0)
  })

  it('should paginate deposits', () => {
    cy.findByRole('button', { name: /load next deposits/i })
      .should('be.visible')
      .should('not.be.disabled')
      .click()
    cy.findByText(/page 2/i).should('be.visible')
    cy.findAllByTestId(DEPOSIT_ROW_IDENTIFIER).should('have.length.above', 0)

    cy.findByRole('button', { name: /load previous deposits/i })
      .should('be.visible')
      .should('not.be.disabled')
      .click()
    cy.findByText(/page 1/i).should('be.visible')
    cy.findAllByTestId(DEPOSIT_ROW_IDENTIFIER).should('have.length.above', 0)
  })

  it('should search deposits', () => {
    cy.findByPlaceholderText(DEPOSIT_SEARCH_IDENTIFIER)
      .type('aaa', { scrollBehavior: false })
      .then(() => {
        cy.wait(2000)
        cy.findAllByTestId(DEPOSIT_ROW_IDENTIFIER).should(
          'have.length.above',
          0
        )
      })

    cy.findByPlaceholderText(DEPOSIT_SEARCH_IDENTIFIER)
      .clear()
      .type('randomInvalidTransactionHash', { scrollBehavior: false })
      .then(() => {
        cy.findByText(
          /Oops! Looks like nothing matched your search query/i
        ).should('be.visible')
        cy.findByPlaceholderText(DEPOSIT_SEARCH_IDENTIFIER).clear()
      })
  })

  it('should load withdrawals', () => {
    cy.findByRole('tab', { name: 'show withdrawal transactions' })
      .should('be.visible')
      .click()
      .should('have.class', 'selected')

    cy.findAllByTestId(WITHDRAWAL_ROW_IDENTIFIER).should('have.length.above', 0)
  })

  it('should paginate withdrawals', () => {
    cy.findByRole('button', { name: /load next withdrawals/i })
      .should('be.visible')
      .should('not.be.disabled')
      .click()
    cy.findByText(/page 2/i).should('be.visible')
    cy.findAllByTestId(WITHDRAWAL_ROW_IDENTIFIER).should('have.length.above', 0)

    cy.findByRole('button', { name: /load previous withdrawals/i })
      .should('be.visible')
      .should('not.be.disabled')
      .click()
    cy.findByText(/page 1/i).should('be.visible')
    cy.findAllByTestId(WITHDRAWAL_ROW_IDENTIFIER).should('have.length.above', 0)
  })

  it('should search withdrawals', () => {
    cy.findByPlaceholderText(WITHDRAWAL_SEARCH_IDENTIFIER)
      .type('aaa', { scrollBehavior: false })
      .then(() => {
        cy.wait(2000)
        cy.findAllByTestId(WITHDRAWAL_ROW_IDENTIFIER).should(
          'have.length.above',
          0
        )
      })

    cy.findByPlaceholderText(WITHDRAWAL_SEARCH_IDENTIFIER)
      .clear()
      .type('randomInvalidTransactionHash', { scrollBehavior: false })
      .then(() => {
        cy.findByText(
          /Oops! Looks like nothing matched your search query/i
        ).should('be.visible')
        cy.findByPlaceholderText(WITHDRAWAL_SEARCH_IDENTIFIER).clear()
      })
  })
})
