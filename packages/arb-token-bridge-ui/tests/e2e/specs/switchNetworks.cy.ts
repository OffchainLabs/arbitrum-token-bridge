/**
 * When user wants to bridge ETH from L1 to L2
 */

import { resetSeenTimeStampCache } from '../../support/commands'

describe('Switch Networks', () => {
  before(() => {
    resetSeenTimeStampCache()
  })

  beforeEach(() => {
    cy.restoreAppState()
  })
  afterEach(() => {
    cy.saveAppState()
  })

  context('User is on test network L1', () => {
    // log in to metamask before deposit
    before(() => {
      cy.login('L1')
    })

    after(() => {
      // after all assertions are executed, logout and reset the account
      cy.logout()
    })

    it('should show L1 and L2 chains correctly', () => {
      cy.findByRole('button', { name: /From: Goerli/i }).should('be.visible')
      cy.findByRole('button', { name: /To: Arbitrum Goerli/i }).should(
        'be.visible'
      )
    })

    context('Test Networks dropdown in Nav bar', () => {
      it('should show and open the networks dropdown', () => {
        // to view the correct list of networks (and not testnets), first navigate to mainnet
        cy.changeMetamaskNetwork('mainnet').then(() => {
          // first wait for Low Balance Popup and close that
          cy.findByRole('button', { name: /Go to bridge/i })
            .should('be.visible')
            .click({ scrollBehavior: false })

          cy.findByRole('button', { name: /Selected Network : /i })
            .should('be.visible')
            .click({ scrollBehavior: false })

          cy.findByRole('button', { name: /Switch to Arbitrum One/i }).should(
            'be.visible'
          )

          //close the dropdown
          cy.findByRole('button', { name: /Selected Network : /i })
            .should('be.visible')
            .click({ scrollBehavior: false })
        })
      })

      it('should change network to Arbitrum One successfully', () => {
        cy.findByRole('button', { name: /Selected Network : /i })
          .should('be.visible')
          .click({ scrollBehavior: false })

        cy.findByRole('button', { name: /Switch to Arbitrum One/i })
          .should('be.visible')
          .click({ scrollBehavior: false })

        cy.allowMetamaskToAddAndSwitchNetwork().then(() => {
          cy.findByRole('button', {
            name: /Selected Network : Arbitrum One/i
          }).should('be.visible')
        })
      })

      it('should change network to Arbitrum Nova successfully', () => {
        cy.findByRole('button', { name: /Selected Network : /i })
          .should('be.visible')
          .click({ scrollBehavior: false })

        cy.findByRole('button', { name: /Switch to Arbitrum Nova/i }).click({
          scrollBehavior: false
        })

        cy.allowMetamaskToAddAndSwitchNetwork().then(() => {
          cy.findByRole('button', {
            name: /Selected Network : Arbitrum Nova/i
          }).should('be.visible')
        })
      })

      it('should change network to Ethereum mainnet successfully', () => {
        cy.findByRole('button', { name: /Selected Network : /i })
          .should('be.visible')
          .click({ scrollBehavior: false })

        cy.findByRole('button', { name: /Switch to Mainnet/i }).click({
          scrollBehavior: false
        })

        cy.allowMetamaskToSwitchNetwork().then(() => {
          cy.findByRole('button', {
            name: /Selected Network : Mainnet/i
          }).should('be.visible')
        })
      })
    })

    context('Test Networks list in Wrong Network UI', () => {
      it('should show wrong network UI', () => {
        cy.changeMetamaskNetwork('kovan').then(() => {
          cy.findByText(/Oops! You’re connected to the wrong network/i).should(
            'be.visible'
          )
        })
      })

      it('should allow Network change from wrong network UI list', () => {
        cy.changeMetamaskNetwork('kovan').then(() => {
          cy.findByRole('button', { name: /Switch to Arbitrum One/i })
            .should('be.visible')
            .click({
              scrollBehavior: false
            })

          cy.allowMetamaskToSwitchNetwork().then(() => {
            cy.findByRole('button', {
              name: /Selected Network : Arbitrum One/i
            }).should('be.visible')
          })
        })
      })
    })
  })
})
