const DEPOSIT_ROW_IDENTIFIER = /deposit-row-*/i
const DEPOSIT_SEARCH_IDENTIFIER = /Search for a full or partial L1 tx ID/i
const WITHDRAWAL_ROW_IDENTIFIER = /withdrawal-row-*/i
const WITHDRAWAL_SEARCH_IDENTIFIER = /Search for a full or partial L2 tx ID/i

describe('Transaction History', () => {
  it('should successfuly open and use deposit history panel', () => {
    cy.login({
      networkType: 'L1',
      networkName: 'goerli'
    })
    // Open tx history panel
    context('open transactions history panel', () => {
      cy.openTransactionsPanel()
      cy.findByText('Transaction History').should('be.visible')
    })

    // Test deposits are loading
    context('load deposits', () => {
      cy.findByRole('tab', { name: 'show deposit transactions' })
        .should('be.visible')
        .click()
        .should('have.attr', 'data-headlessui-state')
        .and('equal', 'selected')

      cy.findAllByTestId(DEPOSIT_ROW_IDENTIFIER).should('have.length.above', 0)
    })

    // Test deposits pagination works
    context('paginate deposits', () => {
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
    context('should search deposits', () => {
      // search for valid address substring
      cy.findByPlaceholderText(DEPOSIT_SEARCH_IDENTIFIER)
        .typeRecursively('0x')
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
        .typeRecursively('0xx') // 0xx is invalid tx hash
        .then($input => {
          cy.wrap($input).scrollIntoView()
          cy.findByText(
            /Oops! Looks like nothing matched your search query/i
          ).should('be.visible')
          cy.findByPlaceholderText(DEPOSIT_SEARCH_IDENTIFIER).clear()
        })
    })
  })

  it('should successfuly open and use withdrawal history panel', () => {
    cy.login({ networkType: 'L1', networkName: 'goerli' })
    // Open tx history panel
    context('open transactions history panel', () => {
      cy.openTransactionsPanel()
      cy.findByText('Transaction History').should('be.visible')
    })

    // Test withdrawals are loading
    context('load withdrawals', () => {
      // If user clicks instantly on the withdraw tab, it might be reset to the first tab (deposits)
      // But it's unlikely to happen, so we add a wait here to avoid false negative
      cy.wait(1_000)
      cy.findByRole('tab', { name: 'show withdrawal transactions' })
        .should('be.visible')
        .click()
        .should('have.attr', 'data-headlessui-state')
        .and('equal', 'selected')

      cy.findAllByTestId(WITHDRAWAL_ROW_IDENTIFIER).should(
        'have.length.above',
        0
      )
    })

    // Test withdrawal pagination works
    context('paginate withdrawals', () => {
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
      cy.findAllByTestId(WITHDRAWAL_ROW_IDENTIFIER).should(
        'have.length.above',
        0
      )

      // go to prev page
      cy.findByRole('button', { name: /load previous withdrawals/i })
        .should('be.visible')
        .should('not.be.disabled')
        .click()
      cy.findByText(/page 1/i).should('be.visible')
      cy.findAllByTestId(WITHDRAWAL_ROW_IDENTIFIER).should(
        'have.length.above',
        0
      )
    })

    // Test withdrawal search works
    context('search withdrawals', () => {
      // search for valid address substring
      cy.findByPlaceholderText(WITHDRAWAL_SEARCH_IDENTIFIER)
        .typeRecursively('0x')
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
        .typeRecursively('0xx') // 0xx is invalid tx hash
        .then($input => {
          cy.wrap($input).scrollIntoView()
          cy.findByText(
            /Oops! Looks like nothing matched your search query/i
          ).should('be.visible')
          cy.findByPlaceholderText(WITHDRAWAL_SEARCH_IDENTIFIER).clear()
        })
    })
  })
})
