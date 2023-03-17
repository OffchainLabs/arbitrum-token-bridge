// 0. Connect to goerli and not local-network
// 1. Open tx history panel
// 2. Test deposits are loading
// 3. Test deposits search works
// 4. Test deposits pagination works
// 5. Test withdrawals are loading
// 6. Test withdrawals search works
// 7. Test withdrawals pagination works
// 8. Test pending transactions works
// 9. Testing all possible row states - mock the API for deposit + withdrawal

import { wait } from 'packages/token-bridge-sdk/dist'
import { startWebApp } from '../../support/common'

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
    cy.findByRole('button', { name: /To Arbitrum Goerli/i })
      .should('be.visible')
      .click()
    cy.findAllByTestId(/deposit-row-*/i).should('have.length.above', 0)
  })

  it('should paginate deposits', () => {
    cy.findByRole('button', { name: /load next deposits/i })
      .should('be.visible')
      //   .should('not.be.disabled')
      .click()
    cy.findByText(/page 2/i).should('be.visible')
    cy.findAllByTestId(/deposit-row-*/i).should('have.length.above', 0)

    cy.findByRole('button', { name: /load previous deposits/i })
      .should('be.visible')
      //   .should('not.be.disabled')
      .click()
    cy.findByText(/page 1/i).should('be.visible')
    cy.findAllByTestId(/deposit-row-*/i).should('have.length.above', 0)
  })

  //   it('should load withdrawals', () => {
  //     cy.openTransactionsPanel()
  //     cy.findByText('Transaction History').should('be.visible')
  //   })

  //   it('should search deposits', () => {
  //     cy.openTransactionsPanel()
  //     cy.findByText('Transaction History').should('be.visible')
  //   })

  //   it('should search deposits', () => {
  //     cy.openTransactionsPanel()
  //     cy.findByText('Transaction History').should('be.visible')
  //   })
})
