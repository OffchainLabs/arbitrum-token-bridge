/**
 * When user wants to bridge ETH from L1 to L2
 */
describe('Withdraw ETH', () => {
  // Happy Path
  context('user has some ETH and is on L1', () => {
    // log in to metamask before withdrawal
    before(() => {
      cy.login()
    })

    beforeEach(() => {
      // restore local storage from first test
      cy.restoreLocalStorage()
    })

    afterEach(() => {
      // cypress clears local storage between tests
      // so in order to preserve local storage on the page between tests
      // we need to use the cypress-localstorage-commands plugin
      // or else we have to visit the page every test which will be much slower
      // https://docs.cypress.io/api/commands/clearlocalstorage
      cy.saveLocalStorage()
    })

    it('should switch to L2 network correctly', () => {
      cy.findByRole('button', { name: /Switch Networks/i })
        .should('be.visible')
        .click({ scrollBehavior: false })
        .then(() => {
          cy.findByRole('button', { name: /From: Arbitrum Goerli/i }).should(
            'be.visible'
          )
          cy.findByRole('button', { name: /To: Goerli/i }).should('be.visible')

          cy.findByRole('button', {
            name: /Move funds to Goerli/i
          })
            .should('be.visible')
            .should('be.disabled')
        })
    })

    context("bridge amount is lower than user's L2 ETH balance value", () => {
      const zeroToLessThanOneETH = /0(\.\d+)*( ETH)/
      it('should show summary', () => {
        cy.findByPlaceholderText('Enter amount')
          .type('0.0001', { scrollBehavior: false })
          .then(() => {
            cy.findByText('You’re moving')
              .siblings()
              .last()
              .contains('0.0001 ETH')
              .should('be.visible')
            cy.findByText('You’ll pay in gas fees')
              .siblings()
              .last()
              .contains(zeroToLessThanOneETH)
              .should('be.visible')
            cy.findByText('L1 gas')
              .parent()
              .siblings()
              .last()
              .contains(zeroToLessThanOneETH)
              .should('be.visible')
            cy.findByText('L2 gas')
              .parent()
              .siblings()
              .last()
              .contains(zeroToLessThanOneETH)
              .should('be.visible')
            cy.findByText('Total amount')
              .siblings()
              .last()
              .contains(/(\d*)(\.\d+)*( ETH)/)
              .should('be.visible')
          })
      })

      it('withdraw button should be clickable', () => {
        cy.findByRole('button', {
          name: /Move funds to Goerli/i
        })
          .should('be.visible')
          .should('not.be.disabled')
          .click({ scrollBehavior: false })
      })

      it('should show withdrawal confirmation', () => {
        cy.allowMetamaskToAddAndSwitchNetwork().then(() => {
          // approve network switch

          cy.findByText(/Use Arbitrum’s bridge/i).should('be.visible')

          // the Continue withdrawal button should be disabled at first
          cy.findByRole('button', {
            name: /Continue/i
          }).should('be.disabled')

          cy.findByRole('switch', {
            name: /before I can claim my funds/i
          })
            .should('be.visible')
            .click({ scrollBehavior: false })

          cy.findByRole('switch', {
            name: /after claiming my funds/i
          })
            .should('be.visible')
            .click({ scrollBehavior: false })
            .then(() => {
              // the Continue withdrawal button should not be disabled now
              cy.findByRole('button', {
                name: /Continue/i
              })
                .should('not.be.disabled')
                .click({ scrollBehavior: false })
            })
        })
      })

      it('should withdraw successfully', () => {
        cy.confirmMetamaskTransaction().then(() => {
          cy.findAllByText(/Moving 0.0001 ETH to Goerli/i).should('be.visible')
        })
      })
    })

    // TODO => test for bridge amount higher than user's L2 ETH balance
  })

  // TODO
  context('user has some ETH and is on L1', () => {})
  // TODO
  context('user has some ETH and is on wrong chain', () => {})
  // TODO
  context('user has 0 ETH and is on L1', () => {})
  // TODO
  context('user has 0 ETH and is on L2', () => {})
  // TODO
  context('user has 0 ETH and is on wrong chain', () => {})
})
