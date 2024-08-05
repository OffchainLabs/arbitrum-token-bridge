/**
 * When user wants to bridge ERC20 from L2 to L1
 */

import { shortenAddress } from '../../../src/util/CommonUtils'
import { formatAmount } from '../../../src/util/NumberUtils'
import {
  getInitialERC20Balance,
  getL1NetworkConfig,
  getL2NetworkConfig,
  getL1NetworkName,
  getL2NetworkName,
  zeroToLessThanOneETH
} from '../../support/common'

describe('Withdraw ERC20 Token', () => {
  let ERC20AmountToSend = Number((Math.random() * 0.001).toFixed(5)) // randomize the amount to be sure that previous transactions are not checked in e2e
  // when all of our tests need to run in a logged-in state
  // we have to make sure we preserve a healthy LocalStorage state
  // because it is cleared between each `it` cypress test

  // Happy Path
  context('User is on L2 and imports ERC-20', () => {
    let l1ERC20bal: string, l2ERC20bal: string
    const l1WethAddress = Cypress.env('L1_WETH_ADDRESS')
    const l2WethAddress = Cypress.env('L2_WETH_ADDRESS')

    // log in to metamask before withdrawal
    beforeEach(() => {
      getInitialERC20Balance({
        tokenAddress: l1WethAddress,
        multiCallerAddress: getL1NetworkConfig().multiCall,
        address: Cypress.env('ADDRESS'),
        rpcURL: Cypress.env('ETH_RPC_URL')
      }).then(
        val =>
          (l1ERC20bal = formatAmount(val, {
            symbol: 'WETH'
          }))
      )

      getInitialERC20Balance({
        tokenAddress: l2WethAddress,
        multiCallerAddress: getL2NetworkConfig().multiCall,
        address: Cypress.env('ADDRESS'),
        rpcURL: Cypress.env('ARB_RPC_URL')
      }).then(
        val =>
          (l2ERC20bal = formatAmount(val, {
            symbol: 'WETH'
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

    it('should withdraw ERC-20 to the same address successfully', () => {
      ERC20AmountToSend = Number((Math.random() * 0.001).toFixed(5)) // randomize the amount to be sure that previous transactions are not checked in e2e

      cy.login({ networkType: 'childChain' })
      context('should add ERC-20 correctly', () => {
        cy.searchAndSelectToken({
          tokenName: 'WETH',
          tokenAddress: l2WethAddress
        })
      })

      context('should show summary', () => {
        cy.typeAmount(ERC20AmountToSend)
          //
          .then(() => {
            cy.findGasFeeSummary(zeroToLessThanOneETH)
            cy.findGasFeeForChain(getL2NetworkName(), zeroToLessThanOneETH)
            cy.findGasFeeForChain(
              new RegExp(
                `You'll have to pay ${getL1NetworkName()} gas fee upon claiming.`,
                'i'
              )
            )
          })
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
          .then(() => {
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
              symbol: 'WETH'
            })
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
          symbol: 'WETH'
        })
      ).click()

      cy.confirmMetamaskTransaction()

      cy.findByLabelText('show settled transactions')
        .should('be.visible')
        .click()

      cy.findByText(
        `${formatAmount(ERC20AmountToSend, {
          symbol: 'WETH'
        })}`
      ).should('be.visible')

      cy.findByLabelText('Close side panel').click()

      cy.searchAndSelectToken({
        tokenName: 'WETH',
        tokenAddress: l2WethAddress
      })

      // the balance on the destination chain should not be the same as before
      cy.findByLabelText('WETH balance amount on parentChain')
        .should('be.visible')
        .its('text')
        .should('not.eq', l1ERC20bal)
    })

    it('should withdraw ERC-20 to custom destination address successfully', () => {
      const ERC20AmountToSend = Number((Math.random() * 0.001).toFixed(5)) // randomize the amount to be sure that previous transactions are not checked in e2e

      cy.login({ networkType: 'childChain' })
      context('should add a new token', () => {
        cy.searchAndSelectToken({
          tokenName: 'WETH',
          tokenAddress: l2WethAddress
        })
      })

      context('should show summary', () => {
        cy.typeAmount(ERC20AmountToSend)
          //
          .then(() => {
            cy.findGasFeeSummary(zeroToLessThanOneETH)
            cy.findGasFeeForChain(getL2NetworkName(), zeroToLessThanOneETH)
            cy.findGasFeeForChain(
              new RegExp(
                `You'll have to pay ${getL1NetworkName()} gas fee upon claiming.`,
                'i'
              )
            )
          })
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
          .then(() => {
            // the Continue withdrawal button should not be disabled now
            cy.findByRole('button', {
              name: /Continue/i
            })
              .should('be.enabled')
              .click()

            cy.confirmMetamaskTransaction().then(() => {
              cy.findTransactionInTransactionHistory({
                duration: 'an hour',
                amount: ERC20AmountToSend,
                symbol: 'WETH'
              })

              cy.checkForCustomDestinationAddressInTransactionDetail(
                Cypress.env('CUSTOM_DESTINATION_ADDRESS')
              )

              // the balance on the source chain should not be the same as before
              cy.findByLabelText('WETH balance amount on childChain')
                .should('be.visible')
                .its('text')
                .should('not.eq', l2ERC20bal)
            })
          })
      })
    })

    // TODO => test for bridge amount higher than user's L2 ERC20 balance
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
