import { JsonRpcProvider } from '@ethersproject/providers'
import { BigNumber } from 'ethers'
import { formatBigNumber } from '../../../src/util/NumberUtils'

async function getInitialETHBalance(rpcURL: string): Promise<BigNumber> {
  const goerliProvider = new JsonRpcProvider(rpcURL)
  return await goerliProvider.getBalance(Cypress.env('ADDRESS'))
}

const goerliRPC = `https://goerli.infura.io/v3/${Cypress.env('INFURA_KEY')}`
const arbitrumGoerliRPC = 'https://goerli-rollup.arbitrum.io/rpc'

/**
 * When user wants to bridge ETH from L1 to L2
 */
describe('Deposit ETH', () => {
  // Happy Path
  context('user has some ETH and is on L1', () => {
    let l1ETHbal
    let l2ETHbal

    before(() => {
      cy.clearLocalStorageSnapshot()
      getInitialETHBalance(goerliRPC).then(
        val => (l1ETHbal = formatBigNumber(val, 18, 5))
      )
      getInitialETHBalance(arbitrumGoerliRPC).then(
        val => (l2ETHbal = formatBigNumber(val, 18, 5))
      )
      cy.disconnectMetamaskWalletFromAllDapps()
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

    it('should show L1 and L2 chains correctly', () => {
      cy.findByRole('button', { name: /From: Goerli/i }).should('be.visible')
      cy.findByRole('button', { name: /To: Arbitrum Goerli/i }).should(
        'be.visible'
      )
    })

    it('should show L1 and L2 ETH balances correctly', () => {
      cy.findByText(`Balance: ${l1ETHbal} ETH`).should('be.visible')
      cy.findByText(`Balance: ${l2ETHbal} ETH`).should('be.visible')
    })

    it('should show empty bridging summary', () => {
      cy.findByText('Bridging summary will appear here.').should('be.visible')
    })

    context("bridge amount is lower than user's L1 ETH balance value", () => {
      const zeroToLessThanOneETH = /0(\.\d+)*( ETH)/
      it('should show summary', () => {
        cy.findByPlaceholderText('Enter amount')
          // https://docs.cypress.io/guides/core-concepts/interacting-with-elements#Scrolling
          // cypress by default tries to scroll the element into view even when it is already in view
          // for unknown reasons, probably due to our root div's overflow:hidden CSS property,
          // cypress would wrongly scroll the div and bring the element to the top of the view
          // and in turn include the full moon into the view, cropping the header out of visible area
          // to circumvent this bug with cypress, scrollBehaviour should be set false for this element
          // because the element is already in view and does not require scrolling
          // https://github.com/cypress-io/cypress/issues/23898
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

      it('should deposit successfully', () => {
        cy.findByRole('button', {
          name: 'Move funds to Arbitrum Goerli'
        }).click({ scrollBehavior: false })
        // https://docs.cypress.io/guides/core-concepts/interacting-with-elements#Scrolling
        // cypress by default tries to scroll the element into view even when it is already in view
        // for unknown reasons, probably due to our root div's overflow:hidden CSS property,
        // cypress would wrongly scroll the div and bring the element to the top of the view
        // and in turn include the full moon into the view, cropping the header out of visible area
        // to circumvent this bug with cypress, scrollBehaviour should be set false for this element
        // because the element is already in view and does not require scrolling
        // https://github.com/cypress-io/cypress/issues/23898

        cy.confirmMetamaskTransaction().then(() => {
          cy.findByText('Moving 0.0001 ETH to Arbitrum Goerli...').should(
            'be.visible'
          )
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
