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
import { shortenAddress } from '../../../src/util/CommonUtils'

describe('Deposit USDC through CCTP', () => {
  // Happy Path
  context('User has some USDC and is on L1', () => {
    let l1USDCBal: string
    let l2USDCBal: string
    let l2USDCeBal: string
    let USDCAmountToSend: number

    // log in to metamask before deposit
    beforeEach(() => {
      USDCAmountToSend = Number((Math.random() * 0.001).toFixed(6)) // randomize the amount to be sure that previous transactions are not checked in e2e

      cy.fundUserWalletEth('L1')
      cy.fundUserUsdcTestnet('L1')
      cy.resetCctpAllowance('L1')

      const address = Cypress.env('ADDRESS')
      getInitialERC20Balance({
        tokenAddress: CommonAddress.Sepolia.USDC,
        multiCallerAddress: getL1TestnetNetworkConfig().multiCall,
        rpcURL: Cypress.env('ETH_SEPOLIA_RPC_URL'),
        address
      }).then(
        val =>
          (l1USDCBal = formatAmount(val, {
            symbol: 'USDC',
            decimals: 6
          }))
      )
      getInitialERC20Balance({
        tokenAddress: CommonAddress.ArbitrumSepolia.USDC,
        multiCallerAddress: getL2TestnetNetworkConfig().multiCall,
        rpcURL: Cypress.env('ARB_SEPOLIA_RPC_URL'),
        address
      }).then(
        val =>
          (l2USDCBal = formatAmount(val, {
            symbol: 'USDC',
            decimals: 6
          }))
      )
      getInitialERC20Balance({
        tokenAddress: CommonAddress.ArbitrumSepolia['USDC.e'],
        multiCallerAddress: getL2TestnetNetworkConfig().multiCall,
        rpcURL: Cypress.env('ARB_SEPOLIA_RPC_URL'),
        address
      }).then(
        val =>
          (l2USDCeBal = formatAmount(val, {
            symbol: 'USDC.e',
            decimals: 6
          }))
      )

      /// common code before all tests
      cy.login({ networkType: 'L1', networkName: 'sepolia' })
      context('should show L1 and L2 chains, and USD correctly', () => {
        cy.findByRole('button', { name: /From: Sepolia/i }).should('be.visible')
        cy.findByRole('button', { name: /To: Arbitrum Sepolia/i }).should(
          'be.visible'
        )
        cy.findByRole('button', { name: 'Select Token' })
          .should('be.visible')
          .should('have.text', 'ETH')
      })

      // Click on the ETH dropdown (Select token button)
      cy.findByRole('button', { name: 'Select Token' })
        .should('be.visible')
        .should('have.text', 'ETH')
        .click()

      // open the Select Token popup
      cy.findByPlaceholderText(/Search by token name/i)
        .typeRecursively(CommonAddress.Sepolia.USDC)
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

      cy.findByLabelText('USDC balance on l1')
        .should('be.visible')
        .contains(l1USDCBal)
      cy.findByLabelText('USDC balance on l2')
        .should('be.visible')
        .contains(l2USDCBal)
      cy.findByLabelText('USDC.e balance on l2')
        .should('be.visible')
        .contains(l2USDCeBal)

      context('should show summary', () => {
        cy.findByPlaceholderText('Enter amount')
          .typeRecursively(String(USDCAmountToSend))
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
          })
      })
    })

    it('should bridge USDC through CCTP successfully', () => {
      context('should show clickable deposit button', () => {
        cy.findByRole('button', {
          name: /Move funds to Arbitrum Sepolia/i
        })
          .scrollIntoView()
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
              cy.findByText('Pending transactions').should('be.visible') // tx history should be opened
              cy.findByText(
                `${formatAmount(USDCAmountToSend, {
                  symbol: 'USDC'
                })}`
              ).should('be.visible')
            })
          }
        )
      })
    })

    it('should bridge USDC to custom destination address through CCTP successfully', () => {
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

      context('should click deposit successfully', () => {
        cy.findByRole('button', {
          name: /Move funds to Arbitrum Sepolia/i
        })
          .scrollIntoView()
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
              cy.findByText('Pending transactions').should('be.visible') // tx history should be opened
              cy.findByText(
                `${formatAmount(USDCAmountToSend, {
                  symbol: 'USDC'
                })}`
              ).should('be.visible')

              // custom destination label in settled tx history should be visible
              cy.findByLabelText(
                `custom address: ${shortenAddress(
                  Cypress.env('CUSTOM_DESTINATION_ADDRESS')
                )}`
              )
            })
          }
        )
      })
    })
  })
})
