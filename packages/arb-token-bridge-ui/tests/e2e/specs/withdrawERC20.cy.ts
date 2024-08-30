/**
 * When user wants to bridge ERC20 from L2 to L1
 */

import { formatAmount } from '../../../src/util/NumberUtils'
import {
  getInitialERC20Balance,
  getL1NetworkConfig,
  getL2NetworkConfig,
  getL1NetworkName,
  getL2NetworkName,
  zeroToLessThanOneETH,
  ERC20TokenSymbol
} from '../../support/common'

const withdrawalTestCases = {
  'Standard ERC20': {
    symbol: ERC20TokenSymbol,
    l1Address: Cypress.env('ERC20_TOKEN_ADDRESS_PARENT_CHAIN'),
    l2Address: Cypress.env('ERC20_TOKEN_ADDRESS_CHILD_CHAIN')
  },
  WETH: {
    symbol: 'WETH',
    l1Address: Cypress.env('L1_WETH_ADDRESS'),
    l2Address: Cypress.env('L2_WETH_ADDRESS')
  }
}

describe('Withdraw ERC20 Token', () => {
  let ERC20AmountToSend = Number((Math.random() * 0.001).toFixed(5)) // randomize the amount to be sure that previous transactions are not checked in e2e
  // when all of our tests need to run in a logged-in state
  // we have to make sure we preserve a healthy LocalStorage state
  // because it is cleared between each `it` cypress test

  Object.keys(withdrawalTestCases).forEach(tokenType => {
    const testCase = withdrawalTestCases[tokenType]
    // Happy Path
    context(`User is on L2 and imports ${tokenType}`, () => {
      let l1ERC20bal: string, l2ERC20bal: string

      // log in to metamask before withdrawal
      beforeEach(() => {
        getInitialERC20Balance({
          tokenAddress: testCase.l1Address,
          multiCallerAddress: getL1NetworkConfig().multiCall,
          address: Cypress.env('ADDRESS'),
          rpcURL: Cypress.env('ETH_RPC_URL')
        }).then(
          val =>
            (l1ERC20bal = formatAmount(val, {
              symbol: testCase.symbol
            }))
        )

        getInitialERC20Balance({
          tokenAddress: testCase.l2Address,
          multiCallerAddress: getL2NetworkConfig().multiCall,
          address: Cypress.env('ADDRESS'),
          rpcURL: Cypress.env('ARB_RPC_URL')
        }).then(
          val =>
            (l2ERC20bal = formatAmount(val, {
              symbol: testCase.symbol
            }))
        )
      })

      it('should show form fields correctly', () => {
        cy.login({ networkType: 'childChain' })
        cy.findSourceChainButton(getL2NetworkName())
        cy.findDestinationChainButton(getL1NetworkName())
        cy.findMoveFundsButton().should('be.disabled')
        cy.findSelectTokenButton('ETH')
      })

      it(`should withdraw ${tokenType} to the same address successfully`, () => {
        ERC20AmountToSend = Number((Math.random() * 0.001).toFixed(5)) // randomize the amount to be sure that previous transactions are not checked in e2e

        cy.login({ networkType: 'childChain' })
        context(`should add ${tokenType} correctly`, () => {
          cy.searchAndSelectToken({
            tokenName: testCase.symbol,
            tokenAddress: testCase.l2Address
          })
        })

        context('should show summary', () => {
          cy.typeAmount(ERC20AmountToSend)
          cy.findGasFeeSummary(zeroToLessThanOneETH)
          cy.findGasFeeForChain(getL2NetworkName(), zeroToLessThanOneETH)
          cy.findGasFeeForChain(
            new RegExp(
              `You'll have to pay ${getL1NetworkName()} gas fee upon claiming.`,
              'i'
            )
          )
        })

        context('should show clickable withdraw button', () => {
          cy.findMoveFundsButton().click()
        })

        context('should withdraw successfully', () => {
          cy.findByText(/Arbitrum’s bridge/i).should('be.visible')

          // the Continue withdrawal button should be disabled at first
          cy.findByRole('button', {
            name: /Continue/i
          }).should('be.disabled')

          cy.findByRole('switch', {
            name: /before I can claim my funds/i
          })
            .should('be.visible')
            .click()

          cy.findByRole('switch', {
            name: /after claiming my funds/i
          })
            .should('be.visible')
            .click()
          // the Continue withdrawal button should not be disabled now
          cy.findByRole('button', {
            name: /Continue/i
          })
            .should('be.enabled')
            .click()

          cy.confirmMetamaskTransaction()

          cy.findTransactionInTransactionHistory({
            duration: 'an hour',
            amount: ERC20AmountToSend,
            symbol: testCase.symbol
          })
        })
      })

      it('should claim funds', { defaultCommandTimeout: 200_000 }, () => {
        // increase the timeout for this test as claim button can take ~(20 blocks *10 blocks/sec) to activate

        cy.login({ networkType: 'parentChain' }) // login to L1 to claim the funds (otherwise would need to change network after clicking on claim)

        cy.findByLabelText('Open Transaction History')
          .should('be.visible')
          .click()

        cy.findClaimButton(
          formatAmount(ERC20AmountToSend, {
            symbol: testCase.symbol
          })
        ).click()

        cy.confirmMetamaskTransaction()

        cy.findByLabelText('show settled transactions')
          .should('be.visible')
          .click()

        cy.findByText(
          `${formatAmount(ERC20AmountToSend, {
            symbol: testCase.symbol
          })}`
        ).should('be.visible')

        cy.findByLabelText('Close side panel').click()

        cy.searchAndSelectToken({
          tokenName: testCase.symbol,
          tokenAddress: testCase.l2Address
        })

        // the balance on the destination chain should not be the same as before
        cy.findByLabelText(`${testCase.symbol} balance amount on parentChain`)
          .should('be.visible')
          .its('text')
          .should('not.eq', l1ERC20bal)
      })

      it(`should withdraw ${tokenType} to custom destination address successfully`, () => {
        const ERC20AmountToSend = Number((Math.random() * 0.001).toFixed(5)) // randomize the amount to be sure that previous transactions are not checked in e2e

        cy.login({ networkType: 'childChain' })
        context('should add a new token', () => {
          cy.searchAndSelectToken({
            tokenName: testCase.symbol,
            tokenAddress: testCase.l2Address
          })
        })

        context('should show summary', () => {
          cy.typeAmount(ERC20AmountToSend)
          cy.findGasFeeSummary(zeroToLessThanOneETH)
          cy.findGasFeeForChain(getL2NetworkName(), zeroToLessThanOneETH)
          cy.findGasFeeForChain(
            new RegExp(
              `You'll have to pay ${getL1NetworkName()} gas fee upon claiming.`,
              'i'
            )
          )
        })

        context('should fill custom destination address successfully', () => {
          cy.fillCustomDestinationAddress()
        })

        context('should show clickable withdraw button', () => {
          cy.findMoveFundsButton().click()
        })

        context('should initiate withdrawal successfully', () => {
          cy.findByText(/Arbitrum’s bridge/i).should('be.visible')

          // the Continue withdrawal button should be disabled at first
          cy.findByRole('button', {
            name: /Continue/i
          }).should('be.disabled')

          cy.findByRole('switch', {
            name: /before I can claim my funds/i
          })
            .should('be.visible')
            .click()

          cy.findByRole('switch', {
            name: /after claiming my funds/i
          })
            .should('be.visible')
            .click()
          // the Continue withdrawal button should not be disabled now
          cy.findByRole('button', {
            name: /Continue/i
          })
            .should('be.enabled')
            .click()

          cy.confirmMetamaskTransaction()
          const txData = {
            amount: ERC20AmountToSend,
            symbol: testCase.symbol
          }
          cy.findTransactionInTransactionHistory({
            duration: 'an hour',
            ...txData
          })
          cy.openTransactionDetails(txData)
          cy.findTransactionDetailsCustomDestinationAddress(
            Cypress.env('CUSTOM_DESTINATION_ADDRESS')
          )

          // close popup
          cy.closeTransactionDetails()
          cy.findByLabelText('Close side panel').click()

          // the balance on the source chain should not be the same as before
          cy.findByLabelText(`${testCase.symbol} balance amount on childChain`)
            .should('be.visible')
            .its('text')
            .should('not.eq', l2ERC20bal)
        })
      })

      // TODO => test for bridge amount higher than user's L2 ERC20 balance
    })
  })

  // TODO - will have both cases:
  // 1. Arbitrum network is not added to metamask yet (add + switch)
  // 2. Arbitrum network already configured in metamask (only switch)
  context('user has some L2-ERC20 and is on L1', () => {})
  // TODO
  context('user has some L2-ERC20 and is on wrong chain', () => {})
  // TODO
  context('user has 0 L2-ERC20 and is on L1', () => {})
  // TODO
  context('user has 0 L2-ERC20 and is on L2', () => {})
  // TODO
  context('user has 0 L2-ERC20 and is on wrong chain', () => {})
  // TODO
  context(
    'user has some LPT tokens which require token approval permission and is on L2',
    () => {}
  )
})
