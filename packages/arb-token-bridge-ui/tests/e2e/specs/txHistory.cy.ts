const DEPOSIT_ROW_IDENTIFIER = /deposit-row-*/i
const DEPOSIT_SEARCH_IDENTIFIER = /Search for a full or partial L1 tx ID/i
const WITHDRAWAL_ROW_IDENTIFIER = /withdrawal-row-*/i
const WITHDRAWAL_SEARCH_IDENTIFIER = /Search for a full or partial L2 tx ID/i

describe('Transaction History', () => {
  it('should successfuly open and use pending transactions panel', () => {
    cy.login({
      networkType: 'L1',
      networkName: 'goerli'
    })
    // open tx history panel
    context('open transactions history panel', () => {
      cy.openTransactionsPanel()
      cy.findByText('Transaction History').should('be.visible')
    })

    context('pending tab should be selected', () => {
      cy.findByRole('tab', { name: 'show pending transactions' })
        .should('be.visible')
        .should('have.attr', 'data-headlessui-state')
        .and('equal', 'selected')
    })

    // wait for transactions to fetch
    cy.waitUntil(
      () =>
        cy
          .findByText(
            /Showing \d+ pending transactions for the last \d+ days\./
          )
          .should('be.visible'),
      {
        errorMsg: 'Failed to fetch transactions.',
        timeout: 30_000,
        interval: 500
      }
    ).then(() => {
      const numberOfWithdrawals = cy
        .findAllByTestId(WITHDRAWAL_ROW_IDENTIFIER)
        .its('length')

      numberOfWithdrawals.should('be.gt', 0)
    })
  })

  it('should successfuly open and use settled transactions panel', () => {
    cy.login({
      networkType: 'L1',
      networkName: 'goerli'
    })
    // open tx history panel
    context('open transactions history panel', () => {
      cy.openTransactionsPanel()
      cy.findByText('Transaction History').should('be.visible')
    })

    context('settled tab should be selected after click', () => {
      cy.findByRole('tab', { name: 'show pending transactions' })
        .should('be.visible')
        .click()
        .should('have.attr', 'data-headlessui-state')
        .and('equal', 'selected')
    })

    // wait for transactions to fetch
    cy.waitUntil(
      () =>
        cy
          .findByText(
            /Showing \d+ pending transactions for the last \d+ days\./
          )
          .should('be.visible'),
      {
        errorMsg: 'Failed to fetch transactions.',
        timeout: 30_000,
        interval: 500
      }
    ).then(() => {
      const numberOfWithdrawals = cy
        .findAllByTestId(WITHDRAWAL_ROW_IDENTIFIER)
        .its('length')

      numberOfWithdrawals.should('be.gt', 0)

      const numberOfDeposits = cy
        .findAllByTestId(WITHDRAWAL_ROW_IDENTIFIER)
        .its('length')

      numberOfDeposits.should('be.gt', 0)
    })
  })
})
