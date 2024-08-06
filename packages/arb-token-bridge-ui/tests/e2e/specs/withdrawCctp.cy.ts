/**
 * When user wants to bridge USDC through CCTP from L2 to L1
 */

import { CommonAddress } from 'packages/arb-token-bridge-ui/src/util/CommonAddressUtils'
import { formatAmount } from '../../../src/util/NumberUtils'
import { shortenAddress } from '../../../src/util/CommonUtils'
import { zeroToLessThanOneETH } from '../../support/common'

// common function for this cctp withdrawal
export const confirmAndApproveCctpWithdrawal = () => {
  cy.findByRole('tab', {
    name: 'Native USDC',
    selected: true
  }).should('exist')
  cy.findByRole('tab', {
    name: 'Native USDC (Third Party Bridge)',
    selected: false
  }).should('exist')

  // By default, confirm button is disabled
  cy.findByRole('button', {
    name: /Continue/i
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
    name: /Continue/i
  })
    .should('be.visible')
    .should('be.enabled')
    .click()

  cy.findByText(/I understand that I have to/).click()
  cy.findByRole('button', {
    name: /Pay approval fee of/
  }).click()
  cy.log('Approving USDC...')
}

describe('Withdraw USDC through CCTP', () => {
  // Happy Path
  context('User is on L2 and imports USDC', () => {
    let USDCAmountToSend: number

    // log in to metamask before withdrawal
    beforeEach(() => {
      cy.fundUserWalletEth('childChain')
      cy.fundUserUsdcTestnet('childChain')
      cy.resetCctpAllowance('childChain')
      USDCAmountToSend = Number((Math.random() * 0.001).toFixed(6)) // randomize the amount to be sure that previous transactions are not checked in e2e

      cy.login({ networkType: 'childChain', networkName: 'arbitrum-sepolia' })
      context('should show L1 and L2 chains, and ETH correctly', () => {
        cy.findSourceChainButton('Arbitrum Sepolia')
        cy.findDestinationChainButton('Sepolia')
        cy.findSelectTokenButton('ETH')
      })

      context('should add USDC token', () => {
        cy.searchAndSelectToken({
          tokenName: 'USDC',
          tokenAddress: CommonAddress.ArbitrumSepolia.USDC
        })
      })
    })

    it('should initiate withdrawing USDC to the same address through CCTP successfully', () => {
      context('should show clickable withdraw button', () => {
        cy.typeAmount(USDCAmountToSend).then(() => {
          cy.findByText(
            'Gas estimates are not available for this action.'
          ).should('be.visible')
          cy.findGasFeeForChain('Arbitrum Sepolia', zeroToLessThanOneETH)
          cy.findGasFeeForChain(
            /You'll have to pay Sepolia gas fee upon claiming./i
          )
        })
        cy.findMoveFundsButton().click()
      })

      context('Should display CCTP modal', () => {
        confirmAndApproveCctpWithdrawal()
        cy.confirmMetamaskPermissionToSpend(USDCAmountToSend.toString()).then(
          () => {
            // eslint-disable-next-line
            cy.wait(40_000)
            cy.confirmMetamaskTransaction().then(() => {
              cy.findTransactionInTransactionHistory({
                duration: 'a minute',
                amount: USDCAmountToSend,
                symbol: 'USDC'
              })
            })
          }
        )
      })
    })

    it('should initiate withdrawing USDC to custom destination address through CCTP successfully', () => {
      context('should show clickable withdraw button', () => {
        cy.typeAmount(USDCAmountToSend)
      })

      context('should fill custom destination address successfully', () => {
        cy.fillCustomDestinationAddress()
      })

      context('should click withdraw successfully', () => {
        cy.findMoveFundsButton().click()
      })

      context('Should display CCTP modal', () => {
        confirmAndApproveCctpWithdrawal()
        cy.confirmMetamaskPermissionToSpend(USDCAmountToSend.toString()).then(
          () => {
            // eslint-disable-next-line
            cy.wait(40_000)
            cy.confirmMetamaskTransaction().then(() => {
              const txData = {
                amount: USDCAmountToSend,
                symbol: 'USDC'
              }
              cy.findTransactionInTransactionHistory({
                duration: 'a minute',
                ...txData
              })
              cy.openTransactionDetails(txData)
              cy.findTransactionDetailsCustomDestinationAddress(
                Cypress.env('CUSTOM_DESTINATION_ADDRESS')
              )
            })
          }
        )
      })
    })
  })
})
