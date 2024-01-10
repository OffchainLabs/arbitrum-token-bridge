/**
 * When user wants to bridge ETH from L1 to L2
 */

describe('Switch Networks', () => {
  context('User is on test network L1', () => {
    it('should show L1 and L2 chains correctly', () => {
      cy.login({ networkType: 'L1' })
      cy.findByRole('button', { name: /From: Ethereum/i }).should('be.visible')
      cy.findByRole('button', { name: /To: Arbitrum/i }).should('be.visible')
    })

    context(
      'User is connected to Ethereum and source chain is Ethereum',
      () => {
        it('should change network to Arbitrum One successfully', () => {
          cy.login({
            networkType: 'L1'
          })
          // cy.waitUntil(
          //   () =>
          cy.findByRole('button', { name: /From: Ethereum/i }).should(
            'be.visible'
          )
          //       ,
          //   {
          //     errorMsg: "Can't find 'From: Ethereum'",
          //     timeout: 10000,
          //     interval: 500
          //   }
          // )
          // cy.waitUntil(
          //   () =>
          cy.findByRole('button', { name: /Switch Networks/i })
            .should('be.visible')
            .click()
          //       ,
          //   {
          //     errorMsg: "Can't find 'Switch Networks'",
          //     timeout: 10000,
          //     interval: 500
          //   }
          // )

          cy.findByRole('button', {
            name: /From: Arbitrum/i
          }).should('be.visible')
        })
      }
    )
  })
})
