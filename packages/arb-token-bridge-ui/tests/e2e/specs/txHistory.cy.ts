const DEPOSIT_ROW_IDENTIFIER = /deposit-row-*/i
const WITHDRAWAL_ROW_IDENTIFIER = /withdrawal-row-*/i

describe('Transaction History', () => {
  it('should successfully open and use pending transactions panel', () => {
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

  it('should successfully open and use settled transactions panel', () => {
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
      cy.findByRole('tab', { name: 'show settled transactions' })
        .should('be.visible')
        .click()
        .should('have.attr', 'data-headlessui-state')
        .and('equal', 'selected')
    })

    cy.waitUntil(
      () =>
        cy
          .findByText(
            /Showing \d+ settled transactions for the last \d+ days\./
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
        .findAllByTestId(DEPOSIT_ROW_IDENTIFIER)
        .its('length')

        numberOfDeposits.should('be.gt', 0)
    })
  })
})
