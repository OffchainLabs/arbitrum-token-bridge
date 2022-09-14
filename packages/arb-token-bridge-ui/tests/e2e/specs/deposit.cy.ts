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
      getInitialETHBalance(goerliRPC).then(
        val => (l1ETHbal = formatBigNumber(val, 18, 5))
      )
      getInitialETHBalance(arbitrumGoerliRPC).then(
        val => (l2ETHbal = formatBigNumber(val, 18, 5))
      )
      cy.disconnectMetamaskWalletFromAllDapps()
      cy.login()
    })

    it('should show l2 chain id on url query param', () => {
      // hardcoded to 421613 because e2e test is run on goerli
      // TODO => add more tests for other chain ids?
      cy.url().should('contain', '?l2ChainId=421613')
    })

    it('should show L1 ETH balance correctly', () => {
      cy.findByText(`Balance: ${l1ETHbal} ETH`).should('be.visible')
    })

    it('should show L2 ETH balance correctly', () => {
      cy.findByText(`Balance: ${l2ETHbal} ETH`).should('be.visible')
    })

    it('should show empty bridging summary', () => {
      cy.findByText('Bridging summary will appear here.').should('be.visible')
    })

    context("bridge amount is lower than user's L1 ETH balance value", () => {
      it('should show summary', () => {
        cy.findByPlaceholderText('Enter amount').type('0.0001')
        cy.wait(3000)
          .findByText('You’re moving')
          .siblings()
          .last()
          .contains('0.0001 ETH')
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
        cy.findByRole('button', {
          name: 'Move funds to Arbitrum Goerli'
        }).click()
        cy.confirmMetamaskTransaction().then(confirmed => {
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
