/**
 * When user wants to bridge USDC through CCTP from L2 to L1
 */

import { CommonAddress } from 'packages/arb-token-bridge-ui/src/util/CommonAddressUtils'
import { formatAmount } from '../../../src/util/NumberUtils'
import { shortenAddress } from '../../../src/util/CommonUtils'

describe('Withdraw USDC through CCTP', () => {
  // Happy Path
  context('User is on L2 and imports USDC', () => {
    let USDCAmountToSend: number

    // log in to metamask before withdrawal
    beforeEach(() => {
      cy.fundUserWalletEth('L2')
      cy.fundUserUsdcTestnet('L2')
      cy.resetCctpAllowance('L2')
      USDCAmountToSend = Number((Math.random() * 0.001).toFixed(6)) // randomize the amount to be sure that previous transactions are not checked in e2e

      cy.login({ networkType: 'L2', networkName: 'arbitrum-sepolia' })
      context('should show L1 and L2 chains, and ETH correctly', () => {
        cy.findByRole('button', { name: /From: Arbitrum Sepolia/i }).should(
          'be.visible'
        )
        cy.findByRole('button', { name: /To: Sepolia/i }).should('be.visible')
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
          .typeRecursively(CommonAddress.ArbitrumSepolia.USDC)
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
    })

    it('should initiate withdrawing USDC to the same address through CCTP successfully', () => {
      context('should show clickable withdraw button', () => {
        cy.findByPlaceholderText('Enter amount').typeRecursively(
          String(USDCAmountToSend)
        )
        cy.findByRole('button', {
          name: /Move funds to Sepolia/i
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

    it('should initiate withdrawing USDC to custom destination address through CCTP successfully', () => {
      context('should show clickable withdraw button', () => {
        cy.findByPlaceholderText('Enter amount').typeRecursively(
          String(USDCAmountToSend)
        )
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

      context('should click withdraw successfully', () => {
        cy.findByRole('button', {
          name: /Move funds to Sepolia/i
        })
          .scrollIntoView()
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

              // custom destination label in pending tx history should be visible
              cy.findAllByLabelText(
                `custom address: ${shortenAddress(
                  Cypress.env('CUSTOM_DESTINATION_ADDRESS')
                )}`
              )
                .first()
                .should('be.visible')
            })
          }
        )
      })
    })
  })
})
