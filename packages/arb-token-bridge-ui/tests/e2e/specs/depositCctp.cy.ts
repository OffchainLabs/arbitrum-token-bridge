/**
 * When user wants to bridge USDC through CCTP from L1 to L2
 */

import { fundEth, fundUsdc, zeroToLessThanOneETH } from '../../support/common'
import { CommonAddress } from '../../../src/util/CommonAddressUtils'
import { BigNumber, Wallet, utils } from 'ethers'
import { StaticJsonRpcProvider } from '@ethersproject/providers'

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

  cy.findByText(/I understand that I have to/)
    .should('be.visible')
    .click()
  cy.findByRole('button', {
    name: /Pay approval fee of/
  }).click()
  cy.log('Approving USDC...')
}

describe('Deposit USDC through CCTP', () => {
  // Happy Path
  let USDCAmountToSend = 0.0001

  beforeEach(() => {
    cy.log('Creating new wallet')
    const userWallet = Wallet.createRandom()
    const userWalletAddress = userWallet.address
    const localWallet = new Wallet(process.env.PRIVATE_KEY_CCTP)
    const arbSepoliaProvider = new StaticJsonRpcProvider(
      Cypress.env('ARB_SEPOLIA_INFURA_RPC_URL')
    )

    cy.importMetamaskAccount(userWallet.privateKey)
    cy.switchMetamaskAccount(3 + Cypress.currentRetry)

    cy.log(`Funding wallet ${userWallet.address}`)
    // Arbitrum Sepolia
    cy.wrap(
      fundEth({
        address: userWalletAddress,
        provider: arbSepoliaProvider,
        sourceWallet: localWallet,
        amount: utils.parseEther('0.01')
      })
    ).then(() => {})
    cy.wrap(
      fundUsdc({
        address: userWalletAddress,
        provider: arbSepoliaProvider,
        networkType: 'childChain',
        sourceWallet: localWallet,
        amount: BigNumber.from(USDCAmountToSend * 2)
      })
    ).then(() => {})

    cy.login({ networkType: 'parentChain', networkName: 'sepolia' })
    cy.findSourceChainButton('Sepolia')
    cy.findDestinationChainButton('Arbitrum Sepolia')
    cy.findSelectTokenButton('ETH')

    cy.searchAndSelectToken({
      tokenName: 'USDC',
      tokenAddress: CommonAddress.Sepolia.USDC
    })

    cy.typeAmount(USDCAmountToSend)
    cy.findGasFeeSummary(zeroToLessThanOneETH)
    cy.findGasFeeForChain('Sepolia', zeroToLessThanOneETH)
    cy.findGasFeeForChain(
      /You'll have to pay Arbitrum Sepolia gas fee upon claiming./i
    )
  })

  it('should initiate depositing USDC to the same address through CCTP successfully', () => {
    cy.findMoveFundsButton().click()

    confirmAndApproveCctpDeposit()
    cy.confirmSpending({
      shouldWaitForPopupClosure: true
    })

    // eslint-disable-next-line
    cy.wait(40_000)
    cy.confirmMetamaskTransaction(undefined)
    cy.findTransactionInTransactionHistory({
      duration: 'a minute',
      amount: USDCAmountToSend,
      symbol: 'USDC'
    })
  })

  it('should initiate depositing USDC to custom destination address through CCTP successfully', () => {
    cy.fillCustomDestinationAddress()
    cy.findMoveFundsButton().click()
    confirmAndApproveCctpDeposit()

    cy.confirmSpending({
      shouldWaitForPopupClosure: true
    })

    // eslint-disable-next-line
    cy.wait(40_000)
    cy.confirmMetamaskTransaction(undefined)
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
})
