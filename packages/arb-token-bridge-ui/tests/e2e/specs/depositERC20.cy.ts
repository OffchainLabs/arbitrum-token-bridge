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

describe('Deposit ERC20 Token', () => {
  // when all of our tests need to run in a logged-in state
  // we have to make sure we preserve a healthy LocalStorage state
  // because it is cleared between each `it` cypress test

  // Happy Path
  context('User has some ERC20 and is on L1', () => {
    let l1ERC20bal: string

    // log in to metamask before deposit
    before(() => {
      getInitialERC20Balance({
        tokenAddress: wethTokenAddressL1,
        multiCallerAddress: getL1NetworkConfig().multiCall,
        address: Cypress.env('ADDRESS'),
        rpcURL: Cypress.env('ETH_RPC_URL')
      }).then(
        val =>
          (l1ERC20bal = formatAmount(val, {
            symbol: 'WETH'
          }))
      )
    })

    it('should show L1 and L2 chains, and ETH correctly', () => {
      cy.login({ networkType: 'L1' })
      cy.findByRole('button', { name: /From: Ethereum/i }).should('be.visible')
      cy.findByRole('button', { name: /To: Arbitrum/i }).should('be.visible')
      cy.findByRole('button', { name: 'Select Token' })
        .should('be.visible')
        .should('have.text', 'ETH')
    })

    it('should bridge ERC-20 successfully', () => {
      const ERC20AmountToSend = Number((Math.random() * 0.001).toFixed(6)) // randomize the amount to be sure that previous transactions are not checked in e2e

      cy.login({ networkType: 'L1' })
      context('should add a new token', () => {
        // Click on the ETH dropdown (Select token button)
        cy.findByRole('button', { name: 'Select Token' })
          .should('be.visible')
          .should('have.text', 'ETH')
          .click()

        // open the Select Token popup
        cy.findByPlaceholderText(/Search by token name/i)
          .typeRecursively(wethTokenAddressL1)
          .should('be.visible')
          .then(() => {
            // Click on the Add new token button

            cy.findByRole('button', { name: 'Add New Token' })
              .should('be.visible')
              .click()

            // Select the WETH token
            cy.findAllByText('WETH').first().click()

            // WETH token should be selected now and popup should be closed after selection
            cy.findByRole('button', { name: 'Select Token' })
              .should('be.visible')
              .should('have.text', 'WETH')
          })
      })

      context('should show ERC-20 balance correctly', () => {
        cy.findByLabelText('WETH balance on l1')
          .should('be.visible')
          .findByText(l1ERC20bal.split(' ')[0]) // only use the number
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
          name: 'Move funds to Arbitrum Local'
        })
          .scrollIntoView()
          .click()
          .then(() => {
            cy.confirmMetamaskTransaction().then(() => {
              cy.findByText('~10 mins remaining').should('be.visible')
              cy.findByText(
                `${formatAmount(ERC20AmountToSend, {
                  symbol: 'WETH'
                })}`
              ).should('be.visible')
            })
          })
      })
    })

    it('should bridge ERC-20 to custom destination address successfully', () => {
      const ERC20AmountToSend = Number((Math.random() * 0.001).toFixed(6)) // randomize the amount to be sure that previous transactions are not checked in e2e

      cy.login({ networkType: 'L1' })
      context('should add a new token', () => {
        // Click on the ETH dropdown (Select token button)
        cy.findByRole('button', { name: 'Select Token' })
          .should('be.visible')
          .should('have.text', 'ETH')
          .click()

        // open the Select Token popup
        cy.findByPlaceholderText(/Search by token name/i)
          .typeRecursively(wethTokenAddressL1)
          .should('be.visible')
          .then(() => {
            // Click on the Add new token button

            cy.findByRole('button', { name: 'Add New Token' })
              .should('be.visible')
              .click()

            // Select the WETH token
            cy.findAllByText('WETH').first().click()

            // WETH token should be selected now and popup should be closed after selection
            cy.findByRole('button', { name: 'Select Token' })
              .should('be.visible')
              .should('have.text', 'WETH')
          })
      })

      context('should show summary', () => {
        cy.findByPlaceholderText('Enter amount')
          .typeRecursively(String(ERC20AmountToSend))
          .then(() => {
            cy.findByText("You're moving")
              .siblings()
              .last()
              .contains(formatAmount(ERC20AmountToSend))
              .should('be.visible')
            cy.findByText("You'll now pay in gas fees")
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
          })
      })

      context('should fill custom destination address successfully', () => {
        // click on advanced settings
        cy.findByLabelText('advanced settings').should('be.visible').click()

        // check if it is open
        cy.findByText('Custom Destination Address').should('be.visible')

        // unlock custom destination address input
        cy.findByLabelText('custom destination input lock')
          .should('be.visible')
          .click()

        cy.findByPlaceholderText(Cypress.env('ADDRESS'))
          .typeRecursively(Cypress.env('CUSTOM_DESTINATION_ADDRESS'))
          .should('be.visible')
      })

      context('should deposit successfully', () => {
        cy.findByRole('button', {
          name: 'Move funds to Arbitrum Local'
        })
          .click()
          .then(() => {
            cy.confirmMetamaskTransaction().then(() => {
              cy.findByText('~10 mins remaining').should('be.visible')
              cy.findByText(
                `${formatAmount(ERC20AmountToSend, {
                  symbol: 'WETH'
                })}`
              ).should('be.visible')

              // custom destination label in pending tx history should be visible
              cy.findByLabelText(
                `custom address: ${shortenAddress(
                  Cypress.env('CUSTOM_DESTINATION_ADDRESS')
                )}`
              ).should('be.visible')
            })
          })
      })

      context('deposit should complete successfully', () => {
        //wait for some time for tx to go through
        cy.wait(30_000).then(() => {
          // switch to settled transactions
          cy.findByLabelText('show settled transactions')
            .should('be.visible')
            .click()

          // find the new amount in settled transactions
          cy.findByText(
            `${formatAmount(ERC20AmountToSend, {
              symbol: 'WETH'
            })}`
          ).should('be.visible')

          // custom destination label in settled tx history should be visible
          cy.findByLabelText(
            `custom address: ${shortenAddress(
              Cypress.env('CUSTOM_DESTINATION_ADDRESS')
            )}`
          )
        })
      })

      context('funds should reach destination account successfully', () => {
        // close transaction history
        cy.findByLabelText('close side panel').click()

        // the deposited amount should be the displayed as new balance of custom destination address
        cy.findByText(formatAmount(ERC20AmountToSend))
          .should('be.visible')
          .siblings()
          .contains('BALANCE: ')
          .siblings()
          .contains('WETH')
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
