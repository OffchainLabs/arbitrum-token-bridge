/**
 * When user wants to bridge ETH from L1 to L2
 */
describe('Deposit ETH', () => {
  // Happy Path
  context('user has some ETH and is on L1', () => {
    before(() => {
      cy.disconnectMetamaskWalletFromAllDapps()
      cy.login()
    })

    it('should show l2 chain id on url query param', () => {
      // hardcoded to 421613 because e2e test is run on goerli
      // TODO => add more tests for other chain ids
      cy.wait(1000).url().should('contain', '?l2ChainId=421613')
    })

    // TODO => use fixture for ETH balance value
    it('should show L1 ETH balance correctly', () => {
      cy.findByRole('button', { name: /From: Goerli/i })
        .parent()
        .siblings()
        .last()
        .contains(/(Balance: )(\d*)(\.\d+)*( ETH)/)
    })

    // TODO => use fixture for ETH balance value
    it('should show L2 ETH balance correctly', () => {
      cy.findByRole('button', { name: /To: Arbitrum Goerli/i })
        .parent()
        .siblings()
        .last()
        .contains(/(Balance: )(\d*)(\.\d+)*( ETH)/)
    })

    it('should show empty bridging summary', () => {
      cy.findByText('Bridging summary will appear here.').should('be.visible')
    })

    context("bridge amount is lower than user's L1 ETH balance value", () => {
      it('should show summary', () => {
        cy.findByPlaceholderText('Enter amount').type('0.01')
        cy.findByText('You’re moving').siblings().last().contains('0.01 ETH')
        cy.findByText('You’ll pay in gas fees')
          .siblings()
          .last()
          .contains(/0\.\d+( ETH)/)
        cy.findByText('L1 gas')
          .parent()
          .siblings()
          .last()
          .contains(/0\.\d+( ETH)/)
        cy.findByText('L2 gas').parent().siblings().last().contains('0 ETH')
        cy.findByText('Total amount')
          .siblings()
          .last()
          .contains(/(\d*)(\.\d+)*( ETH)/)
      })

      it('should deposit successfully', () => {
        cy.findByPlaceholderText('Enter amount').type('0.01')
        cy.findByRole('button', {
          name: 'Move funds to Arbitrum Goerli'
        }).click()
        // TODO => remove undefined. it has to be added now because of synpress' type file
        cy.confirmMetamaskTransaction(undefined).then(confirmed => {
          expect(confirmed).to.be.true
        })
      })
    })

    // TODO => test for bridge amount higher than user's L1 ETH balance
  })

  // TODO
  context('user has some ETH and is on L2', () => {})
  // TODO
  context('user has some ETH and is on wrong chain', () => {})
  // TODO
  context('user has 0 ETH and is on L1', () => {})
  // TODO
  context('user has 0 ETH and is on L2', () => {})
  // TODO
  context('user has 0 ETH and is on wrong chain', () => {})
})
