describe('Switch Networks', () => {
  context('User is on test network L1', () => {
    it('should show L1 and L2 chains correctly', () => {
      cy.login({ networkType: 'L1' })
      cy.findByRole('button', { name: /From: Ethereum/i }).should('be.visible')
      cy.findByRole('button', { name: /To: Arbitrum/i }).should('be.visible')
    })

    context(
      'User is connected to Ethereum, source chain is Ethereum and destination chain is Arbitrum',
      () => {
        it('should switch "from: Ethereum" to "from: Arbitrum" successfully', () => {
          cy.login({
            networkType: 'L1'
          })

          cy.findByRole('button', { name: /From: Ethereum/i }).should(
            'be.visible'
          )

          cy.findByRole('button', { name: /Switch Networks/i })
            .should('be.visible')
            .click()

          cy.findByRole('button', {
            name: /From: Arbitrum/i
          }).should('be.visible')
        })
      }
    )
  })
})
