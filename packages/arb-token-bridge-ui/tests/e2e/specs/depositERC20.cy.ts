/**
 * When user wants to bridge ERC20 from L1 to L2
 */

import { formatAmount } from '../../../src/util/NumberUtils'
import {
  getInitialERC20Balance,
  getL1NetworkConfig,
  zeroToLessThanOneETH,
  getL1NetworkName,
  getL2NetworkName
} from '../../support/common'

const moreThanZeroBalance = /0(\.\d+)/

describe('Deposit ERC20 Token', () => {
  // when all of our tests need to run in a logged-in state
  // we have to make sure we preserve a healthy LocalStorage state
  // because it is cleared between each `it` cypress test

  const isOrbitTest = Cypress.env('ORBIT_TEST') == '1'
  const depositTime = isOrbitTest ? 'Less than a minute' : '9 minutes'
  const l1WethAddress = Cypress.env('L1_WETH_ADDRESS')

  // Happy Path
  context('User has some ERC20 and is on L1', () => {
    let l1ERC20bal: string

    // log in to metamask before deposit
    beforeEach(() => {
      getInitialERC20Balance({
        tokenAddress: l1WethAddress,
        multiCallerAddress: getL1NetworkConfig().multiCall,
        address: Cypress.env('ADDRESS'),
        rpcURL: Cypress.env('ETH_RPC_URL')
      }).then(val => (l1ERC20bal = formatAmount(val)))
    })

    it('should show L1 and L2 chains, and ETH correctly', () => {
      cy.login({ networkType: 'parentChain' })
      cy.findSourceChainButton(getL1NetworkName())
      cy.findDestinationChainButton(getL2NetworkName())
      cy.findSelectTokenButton('ETH')
    })

    it('should deposit ERC-20 successfully to the same address', () => {
      const ERC20AmountToSend = Number((Math.random() * 0.001).toFixed(5)) // randomize the amount to be sure that previous transactions are not checked in e2e

      cy.login({ networkType: 'parentChain' })
      context('should add a new token', () => {
        cy.searchAndSelectToken({
          tokenName: 'WETH',
          tokenAddress: l1WethAddress
        })
      })

      context('should show ERC-20 balance correctly', () => {
        cy.findByLabelText('WETH balance amount on parentChain')
          .should('be.visible')
          .contains(l1ERC20bal)
          .should('be.visible')
      })

      context('should show gas estimations', () => {
        cy.typeAmount(ERC20AmountToSend)
        cy.findGasFeeSummary(zeroToLessThanOneETH)
        cy.findGasFeeForChain(getL1NetworkName(), zeroToLessThanOneETH)
        cy.findGasFeeForChain(getL2NetworkName(), zeroToLessThanOneETH)
      })

      context('should deposit successfully', () => {
        cy.findMoveFundsButton().click()
        cy.confirmMetamaskTransaction()
        cy.findTransactionInTransactionHistory({
          duration: depositTime,
          amount: ERC20AmountToSend,
          symbol: 'WETH'
        })
      })
    })

    it('should deposit ERC-20 to custom destination address successfully', () => {
      const ERC20AmountToSend = Number((Math.random() * 0.001).toFixed(5)) // randomize the amount to be sure that previous transactions are not checked in e2e

      cy.login({ networkType: 'parentChain' })
      context('should add a new token', () => {
        cy.searchAndSelectToken({
          tokenName: 'WETH',
          tokenAddress: l1WethAddress
        })
      })

      context('should show summary', () => {
        cy.typeAmount(ERC20AmountToSend)
        cy.findGasFeeSummary(zeroToLessThanOneETH)
        cy.findGasFeeForChain(getL1NetworkName(), zeroToLessThanOneETH)
        cy.findGasFeeForChain(getL2NetworkName(), zeroToLessThanOneETH)
      })

      context('should fill custom destination address successfully', () => {
        cy.fillCustomDestinationAddress()
      })

      context('should deposit successfully', () => {
        cy.findMoveFundsButton().click()
        cy.confirmMetamaskTransaction()
        const txData = {
          amount: ERC20AmountToSend,
          symbol: 'WETH'
        }
        cy.findTransactionInTransactionHistory({
          duration: depositTime,
          ...txData
        })
        cy.openTransactionDetails(txData)
        cy.findTransactionDetailsCustomDestinationAddress(
          Cypress.env('CUSTOM_DESTINATION_ADDRESS')
        )
        cy.closeTransactionDetails()
      })

      context('deposit should complete successfully', () => {
        // switch to settled transactions
        cy.selectTransactionsPanelTab('settled')

        //wait for some time for tx to go through and find the new amount in settled transactions
        cy.waitUntil(
          () =>
            cy.findTransactionInTransactionHistory({
              duration: 'a few seconds ago',
              amount: ERC20AmountToSend,
              symbol: 'WETH'
            }),
          {
            errorMsg: 'Could not find settled ERC20 Deposit transaction',
            timeout: 60_000,
            interval: 500
          }
        )
        // open the tx details popup
        const txData = {
          amount: ERC20AmountToSend,
          symbol: 'WETH'
        }
        cy.findTransactionInTransactionHistory({
          duration: 'a few seconds ago',
          ...txData
        })
        cy.openTransactionDetails(txData)
        cy.findTransactionDetailsCustomDestinationAddress(
          Cypress.env('CUSTOM_DESTINATION_ADDRESS')
        )
        cy.closeTransactionDetails()
      })

      context('funds should reach destination account successfully', () => {
        // close transaction history
        cy.findByLabelText('Close side panel').click()

        // the custom destination address should now have some balance greater than zero
        cy.findByLabelText('WETH balance amount on childChain')
          .contains(moreThanZeroBalance)
          .should('be.visible')

        // the balance on the source chain should not be the same as before
        cy.findByLabelText('WETH balance amount on parentChain')
          .should('be.visible')
          .its('text')
          .should('not.eq', l1ERC20bal)
      })
    })

    // TODO => test for bridge amount higher than user's L1 ERC20 balance
  })

  // TODO
  context('user has some L1-ERC20 and is on L2', () => {})
  // TODO
  context('user has some L1-ERC20 and is on wrong chain', () => {})
  // TODO
  context('user has 0 L1-ERC20 and is on L1', () => {})
  // TODO
  context('user has 0 L1-ERC20 and is on L2', () => {})
  // TODO
  context('user has 0 L1-ERC20 and is on wrong chain', () => {})
  // TODO
  context(
    'user has some ERC-20 tokens which require token approval permission and is on L1',
    () => {}
  )
  // TODO
  context('approve and send ERC-20 successfully', () => {})
})
