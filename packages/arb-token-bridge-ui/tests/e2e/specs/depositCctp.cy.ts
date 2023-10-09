/**
 * When user wants to bridge USDC through CCTP from L1 to L2
 */

import { formatAmount } from '../../../src/util/NumberUtils'
import {
  getInitialERC20Balance,
  getL1TestnetNetworkConfig,
  getL2TestnetNetworkConfig,
  zeroToLessThanOneETH
} from '../../support/common'
import { CommonAddress } from '../../../src/util/CommonAddressUtils'

describe('Deposit USDC through CCTP', () => {
  // when all of our tests need to run in a logged-in state
  // we have to make sure we preserve a healthy LocalStorage state
  // because it is cleared between each `it` cypress test
  const USDCAmountToSend = 0.0001

  // Happy Path
  context('User has some USDC and is on L1', () => {
    let l1USDCBal: string
    let l2USDCBal: string
    let l2USDCeBal: string

    // log in to metamask before deposit
    before(() => {
      getInitialERC20Balance(
        CommonAddress.Goerli.USDC,
        getL1TestnetNetworkConfig().multiCall,
        Cypress.env('ETH_GOERLI_RPC_URL')
      ).then(
        val =>
          (l1USDCBal = formatAmount(val, {
            symbol: 'USDC',
            decimals: 6
          }))
      )
      getInitialERC20Balance(
        CommonAddress.ArbitrumGoerli.USDC,
        getL2TestnetNetworkConfig().multiCall,
        Cypress.env('ARB_GOERLI_RPC_URL')
      ).then(
        val =>
          (l2USDCBal = formatAmount(val, {
            symbol: 'USDC',
            decimals: 6
          }))
      )
      getInitialERC20Balance(
        CommonAddress.ArbitrumGoerli['USDC.e'],
        getL2TestnetNetworkConfig().multiCall,
        Cypress.env('ARB_GOERLI_RPC_URL')
      ).then(
        val =>
          (l2USDCeBal = formatAmount(val, {
            symbol: 'USDC.e',
            decimals: 6
          }))
      )
    })

    it('should show L1 and L2 chains, and ETH correctly', () => {
      cy.login({ networkType: 'L1', networkName: 'goerli' })
      cy.findByRole('button', { name: /From: Goerli/i }).should('be.visible')
      cy.findByRole('button', { name: /To: Arbitrum Goerli/i }).should(
        'be.visible'
      )
      cy.findByRole('button', { name: 'Select Token' })
        .should('be.visible')
        .should('have.text', 'ETH')
    })

    it('should bridge ERC-20 successfully', () => {
      cy.login({ networkType: 'L1', networkName: 'goerli' })
      context('should add USDC token', () => {
        // Click on the ETH dropdown (Select token button)
        cy.findByRole('button', { name: 'Select Token' })
          .should('be.visible')
          .should('have.text', 'ETH')
          .click()

        // open the Select Token popup
        cy.findByPlaceholderText(/Search by token name/i)
          .typeRecursively(CommonAddress.Goerli.USDC)
          .should('be.visible')
          .then(() => {
            // Click on the Add new token button
            cy.findByRole('button', { name: 'Add New Token' })
              .should('be.visible')
              .click()

            // Select the USDC token
            cy.findAllByText('USDC').first().click()

            // USDC token should be selected now and popup should be closed after selection
            cy.findByRole('button', { name: 'Select Token' })
              .should('be.visible')
              .should('have.text', 'USDC')
          })
      })

      context('should show USDC balance correctly', () => {
        // BALANCE: is in a different element so we check for siblings
        cy.findByText(l1USDCBal)
          .should('be.visible')
          .siblings()
          .contains('BALANCE: ')
        cy.findByText(l2USDCBal).should('be.visible')
        cy.findByText(l2USDCeBal).should('be.visible')
      })

      context('should show summary', () => {
        cy.findByPlaceholderText('Enter amount')
          .typeRecursively(String(USDCAmountToSend))
          .then(() => {
            cy.findByText("You're moving")
              .siblings()
              .last()
              .contains(formatAmount(USDCAmountToSend))
              .should('be.visible')
            cy.findByText("You'll pay in gas fees")
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

      context('should show clickable deposit button', () => {
        cy.findByRole('button', {
          name: /Move funds to Arbitrum Goerli/i
        })
          .should('be.visible')
          .should('be.enabled')
          .click()
      })

      context('Should display CCTP modal', () => {
        // Tabs
        cy.findByRole('tab', {
          name: "Arbitrum's bridge (USDC.e)",
          selected: true
        })
        cy.findByRole('tab', {
          name: 'Third party (USDC)',
          selected: false
        })
        cy.findByRole('tab', {
          name: 'Circle (USDC)',
          selected: false
        }).click()

        // By default, confirm button is disabled
        cy.findByRole('button', {
          name: 'Confirm'
        })
          .should('be.visible')
          .should('be.disabled')

        // Checkbox
        cy.findByRole('switch', {
          name: /I understand that I'll have to send/i
        })
          .should('be.visible')
          .click()
        cy.findByRole('switch', {
          name: /I understand that it will take/i
        })
          .should('be.visible')
          .click()

        cy.findByRole('switch', {
          name: /I understand USDC.e/i
        })
          .should('be.visible')
          .click()

        cy.findByRole('button', {
          name: 'Confirm'
        })
          .should('be.visible')
          .should('be.enabled')
          .click()

        cy.findByText(/I understand that I have to pay a one-time/).click()
        cy.findByRole('button', {
          name: /Pay approval fee of/
        }).click()
        cy.confirmMetamaskPermissionToSpend('1')
        cy.log('Approving ERC-20...')
        // eslint-disable-next-line
        cy.wait(15000)
        cy.confirmMetamaskTransaction().then(() => {
          cy.findByText(
            `Moving ${formatAmount(0.0001, {
              symbol: 'USDC'
            })} to Arbitrum Goerli`
          ).should('be.visible')
        })
      })
    })
  })
})
