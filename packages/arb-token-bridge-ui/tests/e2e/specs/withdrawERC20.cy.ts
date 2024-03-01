/**
 * When user wants to bridge ERC20 from L2 to L1
 */

import { shortenAddress } from '../../../src/util/CommonUtils'
import { formatAmount } from '../../../src/util/NumberUtils'
import {
  getInitialERC20Balance,
  getL2NetworkConfig,
  wethTokenAddressL2,
  zeroToLessThanOneETH
} from '../../support/common'

describe('Withdraw ERC20 Token', () => {
  // when all of our tests need to run in a logged-in state
  // we have to make sure we preserve a healthy LocalStorage state
  // because it is cleared between each `it` cypress test

  // Happy Path
  context('User is on L2 and imports ERC-20', () => {
    let l2ERC20bal: string

    // log in to metamask before deposit
    beforeEach(() => {
      getInitialERC20Balance({
        tokenAddress: wethTokenAddressL2,
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
      cy.login({ networkType: 'L2' })
      cy.findByRole('button', { name: /From: Arbitrum/i }).should('be.visible')
      cy.findByRole('button', { name: /To: Ethereum/i }).should('be.visible')

      cy.findByRole('button', {
        name: /Move funds to Ethereum/i
      })
        .should('be.visible')
        .should('be.disabled')

      cy.findByRole('button', { name: 'Select Token' })
        .should('be.visible')
        .should('have.text', 'ETH')
    })

    it('should withdraw ERC-20 to the same address successfully', () => {
      const ERC20AmountToSend = Number((Math.random() * 0.001).toFixed(5)) // randomize the amount to be sure that previous transactions are not checked in e2e

      cy.login({ networkType: 'L2' })
      context('should add ERC-20 correctly', () => {
        // Click on the ETH dropdown (Select token button)
        cy.findByRole('button', { name: 'Select Token' })
          .should('be.visible')
          .should('have.text', 'ETH')
          .click()

        // open the Select Token popup
        cy.findByPlaceholderText(/Search by token name/i)
          .should('be.visible')
          .typeRecursively(wethTokenAddressL2)
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
            cy.findByText(/You will pay in gas fees:/i)
              .siblings()
              .contains(zeroToLessThanOneETH)
              .should('be.visible')
            cy.findAllByText(/gas fee$/)
              .first()
              .parent()
              .siblings()
              .contains(zeroToLessThanOneETH)
              .should('be.visible')
            cy.findByText(
              /You'll have to pay [\w\s]+ gas fee upon claiming./i
            ).should('be.visible')
            cy.findByText(/You will have to claim the withdrawal on/i).should(
              'be.visible'
            )
          })
      })

      context('should show clickable withdraw button', () => {
        cy.findByRole('button', {
          name: /Move funds to Ethereum/i
        })
          .scrollIntoView()
          .should('be.visible')
          .should('be.enabled')
          .click()
      })

      context('should withdraw successfully', () => {
        cy.findByText(/Use Arbitrum’s bridge/i).should('be.visible')

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
              cy.findByText(
                `${formatAmount(ERC20AmountToSend, {
                  symbol: 'WETH'
                })}`
              ).should('be.visible')
              cy.findAllByText('an hour remaining').first().should('be.visible') // not a problem in CI, but in local our wallet might have previous pending withdrawals
            })
          })
      })
    })

    it('should withdraw ERC-20 to custom destination address successfully', () => {
      const ERC20AmountToSend = Number((Math.random() * 0.001).toFixed(5)) // randomize the amount to be sure that previous transactions are not checked in e2e

      cy.login({ networkType: 'L2' })
      context('should add a new token', () => {
        // Click on the ETH dropdown (Select token button)
        cy.findByRole('button', { name: 'Select Token' })
          .should('be.visible')
          .should('have.text', 'ETH')
          .click()

        // open the Select Token popup
        cy.findByPlaceholderText(/Search by token name/i)
          .typeRecursively(wethTokenAddressL2)
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
            cy.findByText('You will pay in gas fees:')
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

      context('should show clickable withdraw button', () => {
        cy.findByRole('button', {
          name: /Move funds to Ethereum/i
        })
          .scrollIntoView()
          .should('be.visible')
          .should('be.enabled')
          .click()
      })

      context('should initiate withdrawal successfully', () => {
        cy.findByText(/Use Arbitrum’s bridge/i).should('be.visible')

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
              cy.findByText(
                `${formatAmount(ERC20AmountToSend, {
                  symbol: 'WETH'
                })}`
              ).should('be.visible')
              cy.findAllByText('an hour remaining').first().should('be.visible') // not a problem in CI, but in local our wallet might have previous pending withdrawals

              // custom destination label in pending tx history should be visible
              cy.findByLabelText(
                `custom address: ${shortenAddress(
                  Cypress.env('CUSTOM_DESTINATION_ADDRESS')
                )}`
              ).should('be.visible')

              cy.findByLabelText('close side panel').click()

              // the balance on the source chain should not be the same as before
              cy.findByLabelText('WETH balance amount on l2')
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
