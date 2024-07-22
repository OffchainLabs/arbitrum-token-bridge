/**
 * When user wants to bridge ERC20 from L1 to L2
 */

import { formatAmount } from '../../../src/util/NumberUtils'
import {
  getInitialERC20Balance,
  getL1NetworkConfig,
  zeroToLessThanOneETH,
  wethTokenAddressL1
} from '../../support/common'
import { shortenAddress } from '../../../src/util/CommonUtils'

const moreThanZeroBalance = /0(\.\d+)/

describe('Deposit ERC20 Token', () => {
  // when all of our tests need to run in a logged-in state
  // we have to make sure we preserve a healthy LocalStorage state
  // because it is cleared between each `it` cypress test

  // Happy Path
  context('User has some ERC20 and is on L1', () => {
    let l1ERC20bal: string

    // log in to metamask before deposit
    beforeEach(() => {
      getInitialERC20Balance({
        tokenAddress: wethTokenAddressL1,
        multiCallerAddress: getL1NetworkConfig().multiCall,
        address: Cypress.env('ADDRESS'),
        rpcURL: Cypress.env('ETH_RPC_URL')
      }).then(val => (l1ERC20bal = formatAmount(val)))
    })

    it('should show L1 and L2 chains, and ETH correctly', () => {
      cy.login({ networkType: 'L1' })
      cy.findByRole('button', { name: /From: Ethereum/i }).should('be.visible')
      cy.findByRole('button', { name: /To: Arbitrum/i }).should('be.visible')
      cy.findByRole('button', { name: 'Select Token' })
        .should('be.visible')
        .should('have.text', 'ETH')
    })

    it('should deposit ERC-20 successfully to the same address', () => {
      const ERC20AmountToSend = Number((Math.random() * 0.001).toFixed(5)) // randomize the amount to be sure that previous transactions are not checked in e2e

      cy.login({ networkType: 'L1' })
      context('should add a new token', () => {
        cy.searchAndSelectToken({
          tokenName: 'WETH',
          tokenAddress: wethTokenAddressL1
        })
      })

      context('should show ERC-20 balance correctly', () => {
        cy.findByLabelText('WETH balance amount on l1')
          .should('be.visible')
          .contains(l1ERC20bal)
          .should('be.visible')
      })

      context('should show gas estimations', () => {
        cy.findByPlaceholderText('Enter amount')
          .typeRecursively(String(ERC20AmountToSend))
          .then(() => {
            cy.findByText('You will pay in gas fees:')
              .siblings()
              .last()
              .contains(zeroToLessThanOneETH)
              .should('be.visible')
            cy.findByText('Ethereum Local gas fee')
              .parent()
              .siblings()
              .contains(zeroToLessThanOneETH)
              .should('be.visible')
            cy.findByText('Arbitrum Local gas fee')
              .parent()
              .siblings()
              .contains(zeroToLessThanOneETH)
              .should('be.visible')
          })
      })

      context('should deposit successfully', () => {
        cy.findByRole('button', {
          name: /Move funds to Arbitrum Local/i
        })
          .scrollIntoView()
          .should('be.visible')
          .should('be.enabled')
          .click()
          .then(() => {
            cy.confirmMetamaskTransaction().then(() => {
              cy.findByText('10 minutes').should('be.visible')
              cy.findByText(
                `${formatAmount(ERC20AmountToSend, {
                  symbol: 'WETH'
                })}`
              ).should('be.visible')
            })
          })
      })
    })

    it('should deposit ERC-20 to custom destination address successfully', () => {
      const ERC20AmountToSend = Number((Math.random() * 0.001).toFixed(5)) // randomize the amount to be sure that previous transactions are not checked in e2e

      cy.login({ networkType: 'L1' })
      context('should add a new token', () => {
        cy.searchAndSelectToken({
          tokenName: 'WETH',
          tokenAddress: wethTokenAddressL1
        })
      })

      context('should show summary', () => {
        cy.findByPlaceholderText('Enter amount')
          .typeRecursively(String(ERC20AmountToSend))
          .then(() => {
            cy.findByText('You will pay in gas fees:')
              .siblings()
              .last()
              .contains(zeroToLessThanOneETH)
              .should('be.visible')
          })
      })

      context('should fill custom destination address successfully', () => {
        cy.fillCustomDestinationAddress()
      })

      context('should deposit successfully', () => {
        cy.findByRole('button', {
          name: /Move funds to Arbitrum Local/i
        })
          .scrollIntoView()
          .should('be.visible')
          .should('be.enabled')
          .click()
          .then(() => {
            cy.confirmMetamaskTransaction().then(() => {
              cy.findByText('10 minutes').should('be.visible')
              cy.findByText(
                `${formatAmount(ERC20AmountToSend, {
                  symbol: 'WETH'
                })}`
              ).should('be.visible')

              // open the tx details popup
              cy.findAllByLabelText('Transaction details button')
                .first()
                .click()
                .then(() => {
                  cy.findByText('Transaction details').should('be.visible')

                  cy.findByText(/CUSTOM ADDRESS/i).should('be.visible')

                  // custom destination label in pending tx history should be visible
                  cy.findByLabelText(
                    `Custom address: ${shortenAddress(
                      Cypress.env('CUSTOM_DESTINATION_ADDRESS')
                    )}`
                  ).should('be.visible')
                })

              // close popup
              cy.findByLabelText('Close transaction details popup').click()
            })
          })
      })

      context('deposit should complete successfully', () => {
        // switch to settled transactions
        cy.findByLabelText('show settled transactions')
          .should('be.visible')
          .click()

        //wait for some time for tx to go through and find the new amount in settled transactions
        cy.waitUntil(
          () =>
            cy
              .findByText(
                `${formatAmount(ERC20AmountToSend, {
                  symbol: 'WETH'
                })}`
              )
              .should('be.visible'),
          {
            errorMsg: 'Could not find settled ERC20 Deposit transaction',
            timeout: 60_000,
            interval: 500
          }
        ).then(() => {
          // open the tx details popup
          cy.findAllByLabelText('Transaction details button')
            .first()
            .click()
            .then(() => {
              cy.findByText('Transaction details').should('be.visible')

              cy.findByText(/CUSTOM ADDRESS/i).should('be.visible')

              // custom destination label in pending tx history should be visible
              cy.findByLabelText(
                `Custom address: ${shortenAddress(
                  Cypress.env('CUSTOM_DESTINATION_ADDRESS')
                )}`
              ).should('be.visible')
            })

          // close popup
          cy.findByLabelText('Close transaction details popup').click()
        })
      })

      context('funds should reach destination account successfully', () => {
        // close transaction history
        cy.findByLabelText('Close side panel').click()

        // the custom destination address should now have some balance greater than zero
        cy.findByLabelText('WETH balance amount on l2')
          .contains(moreThanZeroBalance)
          .should('be.visible')

        // the balance on the source chain should not be the same as before
        cy.findByLabelText('WETH balance amount on l1')
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
