/**
 * When user wants to bridge USDC through CCTP from L2 to L1
 */

import { CommonAddress } from 'packages/arb-token-bridge-ui/src/util/CommonAddressUtils'
import { formatAmount } from '../../../src/util/NumberUtils'
import {
  getInitialERC20Balance,
  getL2TestnetNetworkConfig
} from '../../support/common'
import { Wallet } from 'ethers'

describe('Withdraw USDC through CCTP', () => {
  const USDCAmountToSend = 0.0001

  // Happy Path
  context('User is on L2 and imports USDC', () => {
    let l2USDCBal: string

    // log in to metamask before withdrawal
    beforeEach(() => {
      const wallet = Wallet.createRandom()
      const address = wallet.address

      cy.importMetamaskAccount(wallet.privateKey)
      cy.switchMetamaskAccount(3 + Cypress.currentRetry)

      cy.fundUserUsdcTestnet(address, 'L2').then(() => {
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
      })
      cy.fundUserWalletEth(address, 'L2')
      // Add ETH on L1 for claiming
      cy.fundUserWalletEth(address, 'L1')
    })

    it('should bridge USDC through CCTP successfully', () => {
      cy.login({ networkType: 'L2', networkName: 'arbitrum-goerli' })
      context('should show L1 and L2 chains, and ETH correctly', () => {
        cy.findByRole('button', { name: /From: Arbitrum Goerli/i }).should(
          'be.visible'
        )
        cy.findByRole('button', { name: /To: Goerli/i }).should('be.visible')
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
        cy.findByLabelText('USDC balance on l2')
          .should('be.visible')
          .contains(l2USDCBal)
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
        cy.log('Approving USDC...')
        cy.confirmMetamaskPermissionToSpend(USDCAmountToSend.toString()).then(
          () => {
            // eslint-disable-next-line
            cy.wait(40_000)
            cy.confirmMetamaskTransaction().then(() => {
              cy.findByText(
                `${formatAmount(USDCAmountToSend, {
                  symbol: 'USDC'
                })}`
              ).should('be.visible')
              cy.findByRole('button', {
                name: 'Switch Network',
                timeout: 2.5 * 60 * 1_000 // CCTP transactions on testnet has a 2 minute delay before being valid
              }).click()

              cy.allowMetamaskToSwitchNetwork().then(() => {
                cy.findByRole('button', { name: 'Claim' }).click()
                cy.confirmMetamaskTransaction().then(() => {
                  cy.findByText('Looks like no transactions here yet!').should(
                    'be.visible'
                  )
                })
              })
            })
          }
        )
      })
    })
  })
})
