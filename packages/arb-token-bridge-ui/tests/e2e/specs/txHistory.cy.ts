const DEPOSIT_ROW_IDENTIFIER = /deposit-row-*/i
const CLAIMABLE_ROW_IDENTIFIER = /claimable-row-*/i

describe('Transaction History', () => {
  it('should successfully open and use pending transactions panel', () => {
    cy.login({
      networkType: 'L1',
      networkName: 'sepolia',
      query: {
        sourceChain: 'sepolia',
        destinationChain: 'arbitrum-sepolia'
      }
    })
    // open tx history panel
    context('open transactions history panel', () => {
      cy.openTransactionsPanel()
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
          .findByText(/Showing \d+ pending transactions made in/)
          .should('be.visible'),
      {
        errorMsg: 'Failed to fetch transactions.',
        timeout: 30_000,
        interval: 500
      }
    ).then(() => {
      const numberOfWithdrawals = cy
        .findAllByTestId(CLAIMABLE_ROW_IDENTIFIER)
        .its('length')

      numberOfWithdrawals.should('be.gt', 0)
    })
  })

  it('should successfully open and use settled transactions panel', () => {
    cy.login({
      networkType: 'L1',
      networkName: 'sepolia',
      query: {
        sourceChain: 'sepolia',
        destinationChain: 'arbitrum-sepolia'
      }
    })
    context('open transactions history panel', () => {
      cy.openTransactionsPanel()
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
          .findByText(/Showing \d+ settled transactions made in/)
          .should('be.visible'),
      {
        errorMsg: 'Failed to fetch transactions.',
        timeout: 30_000,
        interval: 500
      }
    ).then(() => {
      const numberOfWithdrawals = cy
        .findAllByTestId(CLAIMABLE_ROW_IDENTIFIER)
        .its('length')

      numberOfWithdrawals.should('be.gt', 0)

      const numberOfDeposits = cy
        .findAllByTestId(DEPOSIT_ROW_IDENTIFIER)
        .its('length')

      numberOfDeposits.should('be.gt', 0)
    })
  })
})
