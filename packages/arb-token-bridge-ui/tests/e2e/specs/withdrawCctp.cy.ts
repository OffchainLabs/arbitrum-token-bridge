/**
 * When user wants to bridge USDC through CCTP from L2 to L1
 */

import { CommonAddress } from 'packages/arb-token-bridge-ui/src/util/CommonAddressUtils'
import { formatAmount } from '../../../src/util/NumberUtils'
import { shortenAddress } from 'packages/arb-token-bridge-ui/src/util/CommonUtils'
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
  })
    .should('exist')
    .click()

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
  const USDCAmountToSend = 0.0001

  // Happy Path
  context('User is on L2 and imports USDC', () => {
    let USDCAmountToSend: number

    // log in to metamask before withdrawal
    beforeEach(() => {
      const accountName = `wallet_${Cypress.currentRetry}`
      cy.createMetamaskAccount(accountName)
      cy.switchMetamaskAccount(accountName)
      let address: string
      cy.getMetamaskWalletAddress().then(address => cy.log(address))

      cy.fundUserUsdcTestnet(address, 'parentChain')
      cy.fundUserWalletEth(address, 'parentChain')
      // Add ETH on L2 for claiming
      cy.fundUserWalletEth(address, 'childChain')

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

    afterEach(() => {
      cy.disconnectMetamaskWalletFromAllDapps()
      cy.task('setWalletConnectedToDapp', false)
      cy.changeMetamaskNetwork('arbitrum-sepolia')
    })

    it('should initiate withdrawing USDC to the same address through CCTP successfully', () => {
      context('should show clickable withdraw button', () => {
        cy.typeAmount(USDCAmountToSend)
        cy.findByText(
          'Gas estimates are not available for this action.'
        ).should('be.visible')
        cy.findGasFeeForChain('Arbitrum Sepolia', zeroToLessThanOneETH)
        cy.findGasFeeForChain(
          /You'll have to pay Sepolia gas fee upon claiming./i
        )
        cy.findMoveFundsButton().click()
      })

      context('Should display CCTP modal', () => {
        confirmAndApproveCctpWithdrawal()
        cy.confirmMetamaskPermissionToSpend({
          spendLimit: USDCAmountToSend.toString()
        })
        // eslint-disable-next-line
        cy.wait(40_000)
        cy.confirmMetamaskTransaction()
        cy.findByText(
          `${formatAmount(USDCAmountToSend, {
            symbol: 'USDC'
          })}`
        ).should('be.visible')
        cy.findByRole('button', {
          name: 'Switch Network',
          timeout: 2.5 * 60 * 1_000 // CCTP transactions on testnet has a 2 minute delay before being valid
        }).click()

        cy.allowMetamaskToSwitchNetwork()
        cy.findByRole('button', { name: 'Claim' }).click()
        cy.confirmMetamaskTransaction()
        cy.findByText('Looks like no transactions here yet!').should(
          'be.visible'
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
        cy.confirmMetamaskPermissionToSpend({
          spendLimit: USDCAmountToSend.toString()
        })
        // eslint-disable-next-line
        cy.wait(40_000)
        cy.confirmMetamaskTransaction()
        cy.findByText('Pending transactions').should('be.visible') // tx history should be opened
        cy.findByText(
          `${formatAmount(USDCAmountToSend, {
            symbol: 'USDC'
          })}`
        ).should('be.visible')

        // open the tx details popup
        cy.findAllByLabelText('Transaction details button').first().click()
        cy.findByText('Transaction details').should('be.visible')

        cy.findByText(/CUSTOM ADDRESS/i).should('be.visible')

        // custom destination label in pending tx history should be visible
        cy.findByLabelText(
          `Custom address: ${shortenAddress(
            Cypress.env('CUSTOM_DESTINATION_ADDRESS')
          )}`
        ).should('be.visible')

        // close popup
        cy.findByLabelText('Close transaction details popup').click()
      })
    })
  })
})
