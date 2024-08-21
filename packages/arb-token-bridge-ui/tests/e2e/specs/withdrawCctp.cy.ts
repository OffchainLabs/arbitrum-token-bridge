/**
 * When user wants to bridge USDC through CCTP from L2 to L1
 */

import { CommonAddress } from 'packages/arb-token-bridge-ui/src/util/CommonAddressUtils'
import { fundEth, fundUsdc, zeroToLessThanOneETH } from '../../support/common'
import { BigNumber, Wallet, utils } from 'ethers'
import { StaticJsonRpcProvider } from '@ethersproject/providers'

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
  // Happy Path
  const USDCAmountToSend = 0.0001

  // log in to metamask before withdrawal
  beforeEach(() => {
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

    cy.login({ networkType: 'childChain', networkName: 'arbitrum-sepolia' })
    cy.findSourceChainButton('Arbitrum Sepolia')
    cy.findDestinationChainButton('Sepolia')
    cy.findSelectTokenButton('ETH')

    cy.searchAndSelectToken({
      tokenName: 'USDC',
      tokenAddress: CommonAddress.ArbitrumSepolia.USDC
    })

    cy.typeAmount(USDCAmountToSend)
  })

  it('should initiate withdrawing USDC to the same address through CCTP successfully', () => {
    cy.findByText('Gas estimates are not available for this action.').should(
      'be.visible'
    )
    cy.findGasFeeForChain('Arbitrum Sepolia', zeroToLessThanOneETH)
    cy.findGasFeeForChain(/You'll have to pay Sepolia gas fee upon claiming./i)
    cy.findMoveFundsButton().click()

    confirmAndApproveCctpWithdrawal()
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

  it('should initiate withdrawing USDC to custom destination address through CCTP successfully', () => {
    cy.fillCustomDestinationAddress()
    cy.findMoveFundsButton().click()
    confirmAndApproveCctpWithdrawal()

    cy.confirmSpending({
      shouldWaitForPopupClosure: true
    })

    // eslint-disable-next-line
    cy.wait(40_000)
    cy.confirmMetamaskTransaction(undefined)
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
})
