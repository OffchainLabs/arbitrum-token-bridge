/**
 * When user wants to bridge USDC through CCTP from L2 to L1
 */

import { CommonAddress } from 'packages/arb-token-bridge-ui/src/util/CommonAddressUtils'
import { formatAmount } from 'packages/arb-token-bridge-ui/src/util/NumberUtils'

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

  cy.findByText(/I understand that I have to/)
    .should('be.visible')
    .click()
  cy.findByRole('button', {
    name: /Pay approval fee of/
  }).click()
  cy.log('Approving USDC...')
}

describe('Withdraw USDC through CCTP', () => {
  beforeEach(() => {
    cy.login({ networkType: 'childChain', networkName: 'arbitrum-sepolia' })
    cy.findSourceChainButton('Arbitrum Sepolia')
    cy.findDestinationChainButton('Sepolia')
    cy.findSelectTokenButton('ETH')

    cy.searchAndSelectToken({
      tokenName: 'USDC',
      tokenAddress: CommonAddress.ArbitrumSepolia.USDC
    })
  })

  it('should initiate withdrawing USDC to the same address through CCTP successfully', () => {
    const USDCAmountToSend = 0.0001
    cy.typeAmount(USDCAmountToSend)

    cy.findByText('Gas estimates are not available for this action.').should(
      'be.visible'
    )
    cy.findGasFeeForChain(/You'll have to pay Sepolia gas fee upon claiming./i)
    cy.clickMoveFundsButton({ shouldConfirmInMetamask: false })

    confirmAndApproveCctpWithdrawal()
    cy.confirmSpending(USDCAmountToSend.toString())
    // eslint-disable-next-line
    cy.wait(40_000)
    cy.confirmMetamaskTransaction({ gasConfig: 'aggressive' })
    cy.findTransactionInTransactionHistory({
      amount: USDCAmountToSend,
      symbol: 'USDC'
    })
    cy.findClaimButton(
      formatAmount(USDCAmountToSend, {
        symbol: 'USDC'
      }),
      { timeout: 120_000 }
    ).click()
    cy.allowMetamaskToSwitchNetwork()
    cy.rejectMetamaskTransaction()
    cy.changeMetamaskNetwork('arbitrum-sepolia')
  })

  it('should claim deposit', () => {
    cy.changeMetamaskNetwork('sepolia')
    cy.claimCctp(0.00012, { accept: true })
    cy.claimCctp(0.00013, { accept: true })
  })

  it('should initiate withdrawing USDC to custom destination address through CCTP successfully', () => {
    const USDCAmountToSend = 0.00011
    cy.typeAmount(USDCAmountToSend)

    cy.findByText('Gas estimates are not available for this action.').should(
      'be.visible'
    )
    cy.findGasFeeForChain(/You'll have to pay Sepolia gas fee upon claiming./i)
    cy.fillCustomDestinationAddress()
    cy.clickMoveFundsButton({ shouldConfirmInMetamask: false })

    confirmAndApproveCctpWithdrawal()
    cy.confirmSpending(USDCAmountToSend.toString())

    // eslint-disable-next-line
    cy.wait(10_000)
    cy.confirmMetamaskTransaction(undefined)
    const txData = {
      amount: USDCAmountToSend,
      symbol: 'USDC'
    }
    cy.findTransactionInTransactionHistory({
      duration: 'Less than a minute',
      ...txData
    })
    cy.openTransactionDetails(txData)
    cy.findTransactionDetailsCustomDestinationAddress(
      Cypress.env('CUSTOM_DESTINATION_ADDRESS')
    )
    cy.closeTransactionDetails()
    cy.findClaimButton(
      formatAmount(USDCAmountToSend, {
        symbol: 'USDC'
      }),
      { timeout: 120_000 }
    ).click()
    cy.allowMetamaskToSwitchNetwork()
    cy.rejectMetamaskTransaction()
  })
})
