/**
 * When user wants to bridge USDC through CCTP from L1 to L2
 */

import { formatAmount } from '../../../src/util/NumberUtils'
import { fundEth, zeroToLessThanOneETH } from '../../support/common'
import { CommonAddress } from '../../../src/util/CommonAddressUtils'
import { shortenAddress } from 'packages/arb-token-bridge-ui/src/util/CommonUtils'
import { Wallet } from 'ethers'
import { StaticJsonRpcProvider } from '@ethersproject/providers'

// common function for this cctp deposit
const confirmAndApproveCctpDeposit = () => {
  cy.findByRole('tab', {
    name: 'Native USDC',
    selected: true
  })
    .should('exist')
    .click()
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
    let USDCAmountToSend = 0.0001

    // log in to metamask before deposit
    beforeEach(() => {
      const wallet = Wallet.createRandom()
      const address = wallet.address

      cy.importMetamaskAccount(wallet.privateKey)
      cy.switchMetamaskAccount(3 + Cypress.currentRetry)

      cy.fundUserUsdcTestnet(address, 'parentChain')
      const sepoliaProvider = new StaticJsonRpcProvider(
        Cypress.env('ETH_SEPOLIA_RPC_URL')
      )
      const arbSepoliaProvider = new StaticJsonRpcProvider(
        Cypress.env('ARB_SEPOLIA_RPC_URL')
      )
      const localWallet = new Wallet(Cypress.env('LOCAL_WALLET_PRIVATE_KEY'))

      cy.wrap(
        fundEth({
          address,
          provider: sepoliaProvider,
          sourceWallet: localWallet,
          amount: '0.02'
        })
      ).then(() => {})
      cy.wrap(
        fundEth({
          address,
          provider: arbSepoliaProvider,
          sourceWallet: localWallet,
          amount: '0.02'
        })
      ).then(() => {})

      cy.login({ networkType: 'parentChain', networkName: 'sepolia' })

      context('should show L1 and L2 chains, and USD correctly', () => {
        cy.findSourceChainButton('Sepolia')
        cy.findDestinationChainButton('Arbitrum Sepolia')
        cy.findSelectTokenButton('ETH')
        cy.searchAndSelectToken({
          tokenName: 'USDC',
          tokenAddress: CommonAddress.Sepolia.USDC
        })
      })

      context('should show summary', () => {
        cy.typeAmount(USDCAmountToSend)
        cy.findGasFeeSummary(zeroToLessThanOneETH)
        cy.findGasFeeForChain('Sepolia', zeroToLessThanOneETH)
        cy.findGasFeeForChain(
          /You'll have to pay Arbitrum Sepolia gas fee upon claiming./i
        )
      })
    })

    afterEach(() => {
      cy.disconnectMetamaskWalletFromAllDapps()
      cy.task('setWalletConnectedToDapp', false)
      cy.changeMetamaskNetwork('sepolia')
    })

    it('should initiate depositing USDC to the same address through CCTP successfully', () => {
      context('should show clickable deposit button', () => {
        cy.findMoveFundsButton().click()
      })

      context('should display CCTP modal and claim', () => {
        confirmAndApproveCctpDeposit()
        cy.confirmMetamaskPermissionToSpend(USDCAmountToSend.toString())
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

    it.skip('should initiate depositing USDC to custom destination address through CCTP successfully', () => {
      context('should fill custom destination address successfully', () => {
        cy.fillCustomDestinationAddress()
      })

      context('should show clickable deposit button', () => {
        cy.findMoveFundsButton().click()
      })

      context('Should display CCTP modal', () => {
        confirmAndApproveCctpDeposit()
        cy.confirmMetamaskPermissionToSpend(USDCAmountToSend.toString())
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
