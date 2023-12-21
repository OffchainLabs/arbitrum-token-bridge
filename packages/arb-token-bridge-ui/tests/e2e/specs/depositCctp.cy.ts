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
  const USDCAmountToSend = 0.0001

  // Happy Path
  context('User has some USDC and is on L1', () => {
    let l1USDCBal: string
    let l2USDCBal: string
    let l2USDCeBal: string

    // log in to metamask before deposit
    beforeEach(() => {
      cy.fundUserWalletEth('L1')
      cy.fundUserUsdcTestnet('L1')
      cy.resetCctpAllowance('L1')

      const address = Cypress.env('ADDRESS')
      getInitialERC20Balance({
        tokenAddress: CommonAddress.Goerli.USDC,
        multiCallerAddress: getL1TestnetNetworkConfig().multiCall,
        rpcURL: Cypress.env('ETH_GOERLI_RPC_URL'),
        address
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
        address
      }).then(
        val =>
          (l2USDCBal = formatAmount(val, {
            symbol: 'USDC',
            decimals: 6
          }))
      )
      getInitialERC20Balance({
        tokenAddress: CommonAddress.ArbitrumGoerli['USDC.e'],
        multiCallerAddress: getL2TestnetNetworkConfig().multiCall,
        rpcURL: Cypress.env('ARB_GOERLI_RPC_URL'),
        address
      }).then(
        val =>
          (l2USDCeBal = formatAmount(val, {
            symbol: 'USDC.e',
            decimals: 6
          }))
      )
    })

    it(
      'should bridge USDC through CCTP successfully',
      {
        retries: {
          runMode: 1,
          openMode: 1
        }
      },
      () => {
        cy.login({ networkType: 'L1', networkName: 'goerli' })
        context('should show L1 and L2 chains, and USD correctly', () => {
          cy.findByRole('button', { name: /From: Goerli/i }).should(
            'be.visible'
          )
          cy.findByRole('button', { name: /To: Arbitrum Goerli/i }).should(
            'be.visible'
          )
          cy.findByRole('button', { name: 'Select Token' })
            .should('be.visible')
            .should('have.text', 'ETH')
        })
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
          cy.findByLabelText('USDC balance on l1')
            .should('be.visible')
            .contains(l1USDCBal)
          cy.findByLabelText('USDC balance on l2')
            .should('be.visible')
            .contains(l2USDCBal)
          cy.findByLabelText('USDC.e balance on l2')
            .should('be.visible')
            .contains(l2USDCeBal)
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
          }).should('exist')
          cy.findByRole('tab', {
            name: 'Third party (USDC)',
            selected: false
          }).should('exist')
          cy.findByRole('tab', {
            name: 'Circle (USDC)',
            selected: false
          })
            .should('exist')
            .click()

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
          cy.log('Approving USDC...')
          cy.confirmMetamaskPermissionToSpend(USDCAmountToSend.toString()).then(
            () => {
              // eslint-disable-next-line
              cy.wait(40_000)
              cy.confirmMetamaskTransaction().then(() => {
                cy.findByText(
                  `Moving ${formatAmount(USDCAmountToSend, {
                    symbol: 'USDC'
                  })} to Arbitrum Goerli`
                ).should('be.visible')
              })
            }
          )
        })
      }
    )
  })
})
