/**
 * When user wants to bridge USDC through CCTP from L1 to L2
 */

import { zeroToLessThanOneETH } from '../../support/common'
import { CommonAddress } from '../../../src/util/CommonAddressUtils'
import { shortenAddress } from '../../../src/util/CommonUtils'

// common function for this cctp deposit
const confirmAndApproveCctpDeposit = () => {
  cy.findByRole('tab', {
    name: 'Native USDC',
    selected: true
  }).should('exist')
  cy.findByRole('tab', {
    name: 'Native USDC (Third Party Bridge)',
    selected: false
  }).should('exist')
  cy.findByRole('tab', {
    name: 'Wrapped USDC (USDC.e)',
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

  cy.findByRole('switch', {
    name: /I understand USDC.e/i
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

describe('Deposit USDC through CCTP', () => {
  // Happy Path
  context('User has some USDC and is on L1', () => {
    let USDCAmountToSend: number = 0

    // log in to metamask before deposit
    beforeEach(() => {
      USDCAmountToSend = Number((Math.random() * 0.001).toFixed(6)) // randomize the amount to be sure that previous transactions are not checked in e2e

      cy.fundUserWalletEth('parentChain')
      cy.fundUserUsdcTestnet('parentChain')
      cy.resetCctpAllowance('parentChain')

      /// common code before all tests
      cy.login({ networkType: 'parentChain', networkName: 'sepolia' })
      context('should show L1 and L2 chains, and USD correctly', () => {
        cy.findSourceChainButton('Sepolia')
        cy.findDestinationChainButton('Arbitrum Sepolia')
        cy.findSelectTokenButton('ETH')
      })

      cy.searchAndSelectToken({
        tokenName: 'USDC',
        tokenAddress: CommonAddress.Sepolia.USDC
      })

      context('should show summary', () => {
        cy.typeAmount(USDCAmountToSend)
          //
          .then(() => {
            cy.findGasFeeSummary(zeroToLessThanOneETH)
            cy.findGasFeeForChain('Sepolia', zeroToLessThanOneETH)
            cy.findGasFeeForChain(
              /You'll have to pay Arbitrum Sepolia gas fee upon claiming./i
            )
          })
      })
    })

    it('should initiate depositing USDC to the same address through CCTP successfully', () => {
      context('should show clickable deposit button', () => {
        cy.findMoveFundsButton().click()
      })

      context('Should display CCTP modal', () => {
        confirmAndApproveCctpDeposit()
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

    it('should initiate depositing USDC to custom destination address through CCTP successfully', () => {
      context('should fill custom destination address successfully', () => {
        cy.fillCustomDestinationAddress()
      })

      context('should click deposit successfully', () => {
        cy.findMoveFundsButton().click()
      })

      context('Should display CCTP modal', () => {
        confirmAndApproveCctpDeposit()
        cy.confirmMetamaskPermissionToSpend(USDCAmountToSend.toString()).then(
          () => {
            // eslint-disable-next-line
            cy.wait(40_000)
            cy.confirmMetamaskTransaction().then(() => {
              const txData = { amount: USDCAmountToSend, symbol: 'USDC' }
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
