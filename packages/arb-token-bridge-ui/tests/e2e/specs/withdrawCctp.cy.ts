/**
 * When user wants to bridge USDC through CCTP from L2 to L1
 */

import { CommonAddress } from 'packages/arb-token-bridge-ui/src/util/CommonAddressUtils'
import { formatAmount } from '../../../src/util/NumberUtils'
import {
  getInitialERC20Balance,
  getL1TestnetNetworkConfig,
  getL2TestnetNetworkConfig,
  zeroToLessThanOneETH
} from '../../support/common'

describe('Withdraw USDC through CCTP', () => {
  // when all of our tests need to run in a logged-in state
  // we have to make sure we preserve a healthy LocalStorage state
  // because it is cleared between each `it` cypress test
  const USDCAmountToSend = 0.0001

  // Happy Path
  context('User is on L2 and imports USDC', () => {
    let l1USDCBal: string
    let l2USDCBal: string

    // log in to metamask before deposit
    before(() => {
      getInitialERC20Balance({
        tokenAddress: CommonAddress.Goerli.USDC,
        multiCallerAddress: getL1TestnetNetworkConfig().multiCall,
        rpcURL: Cypress.env('ETH_GOERLI_RPC_URL'),
        address: Cypress.env('ADDRESS')
      }).then(
        val =>
          (l1USDCBal = formatAmount(val, {
            symbol: 'USDC',
            decimals: 6
          }))
      )
      getInitialERC20Balance({
        tokenAddress: CommonAddress.ArbitrumGoerli.USDC,
        multiCallerAddress: getL2TestnetNetworkConfig().multiCall,
        rpcURL: Cypress.env('ARB_GOERLI_RPC_URL'),
        address: Cypress.env('ADDRESS')
      }).then(
        val =>
          (l2USDCBal = formatAmount(val, {
            symbol: 'USDC',
            decimals: 6
          }))
      )
    })

    it('should show L1 and L2 chains, and ETH correctly', () => {
      cy.login({ networkType: 'L2', networkName: 'arbitrum-goerli' })
      cy.findByRole('button', { name: /From: Arbitrum Goerli/i }).should(
        'be.visible'
      )
      cy.findByRole('button', { name: /To: Goerli/i }).should('be.visible')
      cy.findByRole('button', { name: 'Select Token' })
        .should('be.visible')
        .should('have.text', 'ETH')
    })

    it('should bridge USDC through CCTP successfully', () => {
      cy.login({ networkType: 'L2', networkName: 'arbitrum-goerli' })
      context('should add USDC token', () => {
        // Click on the ETH dropdown (Select token button)
        cy.findByRole('button', { name: 'Select Token' })
          .should('be.visible')
          .should('have.text', 'ETH')
          .click()

        // open the Select Token popup
        cy.findByPlaceholderText(/Search by token name/i)
          .typeRecursively(CommonAddress.ArbitrumGoerli.USDC)
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
        cy.findByText(l2USDCBal)
          .should('be.visible')
          .siblings()
          .contains('BALANCE: ')
        cy.findByText(l1USDCBal)
          .should('be.visible')
          .siblings()
          .contains('BALANCE: ')
      })

      context('should show clickable withdraw button', () => {
        cy.findByPlaceholderText('Enter amount').typeRecursively(
          String(USDCAmountToSend)
        )
        cy.findByRole('button', {
          name: /Move funds to Goerli/i
        })
          .should('be.visible')
          .should('be.enabled')
          .click()
      })

      context('Should display CCTP modal', () => {
        // Tabs
        cy.findByRole('tab', {
          name: 'Third party (USDC)',
          selected: true
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
        cy.log('Approving USDC...')
        // eslint-disable-next-line
        cy.wait(15000)
        cy.confirmMetamaskTransaction().then(() => {
          cy.findByText(
            `Moving ${formatAmount(0.0001, {
              symbol: 'USDC'
            })} to Goerli`
          ).should('be.visible')
        })
      })
    })
  })
})
