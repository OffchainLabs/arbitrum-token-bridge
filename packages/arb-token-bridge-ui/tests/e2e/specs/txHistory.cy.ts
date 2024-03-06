const DEPOSIT_ROW_IDENTIFIER = /deposit-row-*/i
const CLAIMABLE_ROW_IDENTIFIER = /claimable-row-*/i

describe('Transaction History', () => {
  it('should successfully open and use pending transactions panel', () => {
    cy.login({
      networkType: 'L1',
      networkName: 'goerli',
      query: {
        sourceChain: 'goerli',
        destinationChain: 'arbitrum-goerli'
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

    // We load 3 transactions in a batch, and only we load more only if these transactions happened last month
    // Our 3 most recent transactions are settled transactions.
    // That means 'Load more' button click is required to fetch our pending transaction.
    cy.waitUntil(
      () => cy.findByRole('button', { name: 'Load more' }).should('be.visible'),
      {
        errorMsg: 'Did not find Load more button.',
        timeout: 30_000,
        interval: 500
      }
    ).then(btn => {
      cy.wrap(btn).click()
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
      networkName: 'goerli',
      query: {
        sourceChain: 'goerli',
        destinationChain: 'arbitrum-goerli'
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
