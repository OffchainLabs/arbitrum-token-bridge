/**
 * When user wants to bridge ETH from L1 to L2
 */

import { optimism } from 'wagmi/chains'

describe('Switch Networks', () => {
  context('User is on test network L1', () => {
    it('should show L1 and L2 chains correctly', () => {
      cy.login({ networkType: 'L1' })
      cy.findByRole('button', { name: /From: Ethereum/i }).should('be.visible')
      cy.findByRole('button', { name: /To: Arbitrum/i }).should('be.visible')
    })

    context('Test Networks dropdown in Nav bar', () => {
      it('should show and open the networks dropdown', () => {
        // to view the correct list of networks (and not testnets), first navigate to mainnet
        cy.login({
          networkType: 'L1',
          networkName: 'mainnet'
        })
        cy.waitUntil(
          () =>
            cy
              .findByRole('button', { name: 'Selected Network : Ethereum' })
              .should('be.visible')
              .click(),
          {
            errorMsg: "Can't find 'Selected Network : Ethereum'",
            timeout: 10000,
            interval: 500
          }
        )

        cy.findByRole('button', { name: /Switch to Arbitrum One/i }).should(
          'be.visible'
        )

        //close the dropdown
        cy.findByRole('button', { name: /Selected Network : /i })
          .should('be.visible')
          .click()
      })

      // TODO: fix Arb1 network switch:
      // Disclaimer pops up in the Metamask notification, need to find a way to click it.
      // it('should change network to Arbitrum One successfully', () => {
      //   cy.findByRole('button', { name: /Selected Network : /i })
      //     .should('be.visible')
      //     .click()

      //   cy.findByRole('button', { name: /Switch to Arbitrum One/i })
      //     .should('be.visible')
      //     .click()

      //   cy.allowMetamaskToAddAndSwitchNetwork().then(() => {
      //     cy.findByRole('button', {
      //       name: /Selected Network : Arbitrum One/i
      //     }).should('be.visible')
      //   })
      // })

      it('should change network to Arbitrum Nova successfully', () => {
        cy.login({
          networkType: 'L1'
        })
        cy.waitUntil(
          () =>
            cy
              .findByRole('button', { name: 'Selected Network : Ethereum' })
              .should('be.visible')
              .click(),
          {
            errorMsg: "Can't find 'Selected Network : Ethereum'",
            timeout: 10000,
            interval: 500
          }
        )

        cy.findByRole('button', { name: /Switch to Arbitrum Nova/i }).click()

        cy.allowMetamaskToAddAndSwitchNetwork().then(() => {
          cy.findByRole('button', {
            name: /Selected Network : Arbitrum Nova/i
          }).should('be.visible')
        })
      })

      it('should change network to Ethereum mainnet successfully', () => {
        cy.login({ networkType: 'L1' })
        cy.waitUntil(
          () =>
            cy
              .findByRole('button', {
                name: 'Selected Network : Arbitrum Nova'
              })
              .should('be.visible')
              .click(),
          {
            errorMsg: "Can't find 'Selected Network : Ethereum'",
            timeout: 10000,
            interval: 500
          }
        ).then(() => {
          cy.findByRole('button', { name: /Switch to Ethereum/i }).click()

          cy.allowMetamaskToSwitchNetwork().then(() => {
            cy.findByRole('button', {
              name: /Selected Network : Ethereum/i
            }).should('be.visible')
          })
        })
      })
    })
  })
})
