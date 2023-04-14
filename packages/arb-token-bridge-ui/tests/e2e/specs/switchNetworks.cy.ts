/**
 * When user wants to bridge ETH from L1 to L2
 */

describe('Switch Networks', () => {
  context('User is on test network L1', () => {
    it('should show L1 and L2 chains correctly', () => {
      cy.login({ networkType: 'L1', shouldChangeNetwork: true })
      cy.findByRole('button', { name: /From: Ethereum/i }).should('be.visible')
      cy.findByRole('button', { name: /To: Arbitrum/i }).should('be.visible')
    })

    context('Test Networks dropdown in Nav bar', () => {
      it('should show and open the networks dropdown', () => {
        // to view the correct list of networks (and not testnets), first navigate to mainnet
        cy.login({
          networkType: 'L1',
          networkName: 'mainnet',
          shouldChangeNetwork: true
        })
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

      // TODO: fix Arb1 network switch:
      // Disclaimer pops up in the Metamask notification, need to find a way to click it.
      // it('should change network to Arbitrum One successfully', () => {
      //   cy.findByRole('button', { name: /Selected Network : /i })
      //     .should('be.visible')
      //     .click({ scrollBehavior: false })

      //   cy.findByRole('button', { name: /Switch to Arbitrum One/i })
      //     .should('be.visible')
      //     .click({ scrollBehavior: false })

      //   cy.allowMetamaskToAddAndSwitchNetwork().then(() => {
      //     cy.findByRole('button', {
      //       name: /Selected Network : Arbitrum One/i
      //     }).should('be.visible')
      //   })
      // })

      it('should change network to Arbitrum Nova successfully', () => {
        cy.login({ networkType: 'L1', shouldChangeNetwork: true })
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
        cy.login({ networkType: 'L1' })
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

    context.only('Test Networks list in Wrong Network UI', () => {
      it('should show wrong network UI', () => {
        cy.login({
          networkType: 'L1'
        })
        // Arbitrary waiting time has to be added to ensure Transfer Panel is loaded
        // .waitUntil did not work as it causes the whole process including login to loop
        cy.wait(12000)
          .findByRole('button', { name: /From: Ethereum/i })
          .should('be.visible')
          // .waitUntil(
          //   () => {
          //     cy.findByRole('button', { name: /From: Ethereum/i }).should(
          //       'be.visible'
          //     )
          //   },
          //   {
          //     errorMsg: "Can't find /From: Ethereum/i",
          //     timeout: 2000, // waits up to 2000 ms, default to 5000
          //     interval: 500 // performs the check every 500 ms, default to 200
          //   }
          // )
          .changeMetamaskNetwork('Sepolia test network')
          .then(() =>
            cy
              .findByText(/Oops! You’re connected to the wrong network/i)
              .should('be.visible')
          )

        context('Allow Network change from wrong network UI list', () => {
          cy.findByRole('button', { name: /Switch to Arbitrum Goerli/i })
            .should('be.visible')
            .click({
              scrollBehavior: false
            })

          cy.allowMetamaskToAddAndSwitchNetwork().then(() => {
            cy.findByRole('button', {
              name: /Selected Network : Arbitrum Goerli/i
            }).should('be.visible')
          })
        })
      })
    })
  })
})
