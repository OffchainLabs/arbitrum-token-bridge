/**
 * When user wants to bridge USDC through CCTP from L1 to L2
 */

import { formatAmount } from '../../../src/util/NumberUtils'
import { zeroToLessThanOneETH } from '../../support/common'
import { CommonAddress } from '../../../src/util/CommonAddressUtils'
import { shortenAddress } from 'packages/arb-token-bridge-ui/src/util/CommonUtils'

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
      const accountName = `wallet_${Cypress.currentRetry}`
      cy.createMetamaskAccount(accountName)
      cy.switchMetamaskAccount(accountName)
      let address: string
      cy.getMetamaskWalletAddress().then(address => cy.log(address))

      cy.fundUserUsdcTestnet(address, 'L1')
      cy.fundUserWalletEth(address, 'L1')
      // Add ETH on L2 for claiming
      cy.fundUserWalletEth(address, 'L2')

      cy.login({ networkType: 'L1', networkName: 'sepolia' })
      context('should show L1 and L2 chains, and USD correctly', () => {
        cy.findSourceChainButton('Sepolia')
        cy.findDestinationChainButton('Arbitrum Sepolia')
        cy.findByRole('button', { name: 'Select Token' })
          .should('be.visible')
          .should('have.text', 'ETH')
      })

      cy.searchAndSelectToken({
        tokenName: 'USDC',
        tokenAddress: CommonAddress.Sepolia.USDC
      })

      context('should show summary', () => {
        cy.typeAmount(USDCAmountToSend)
          //
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

    afterEach(() => {
      cy.disconnectMetamaskWalletFromAllDapps()
      cy.task('setWalletConnectedToDapp', false)
      cy.changeMetamaskNetwork('sepolia')
    })

    it('should initiate depositing USDC to the same address through CCTP successfully', () => {
      context('should click deposit succesfully', () => {
        cy.findByRole('button', {
          name: /Move funds to Arbitrum Sepolia/i
        })
          .scrollIntoView()
          .should('be.visible')
          .should('be.enabled')
          .click()
      })

      context('should display CCTP modal and claim', () => {
        confirmAndApproveCctpDeposit()
        cy.confirmMetamaskPermissionToSpend({
          spendLimit: USDCAmountToSend.toString()
        }).then(() => {
          // eslint-disable-next-line
          cy.wait(40_000)
          cy.confirmMetamaskTransaction()
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
        })
      })
    })

    it('should initiate depositing USDC to custom destination address through CCTP successfully', () => {
      context('should fill custom destination address successfully', () => {
        cy.fillCustomDestinationAddress()
      })

      context('should click deposit succesfully', () => {
        cy.findByRole('button', {
          name: /Move funds to Arbitrum Sepolia/i
        })
          .scrollIntoView()
          .should('be.visible')
          .should('be.enabled')
          .click()
      })

      context('Should display CCTP modal', () => {
        confirmAndApproveCctpDeposit()
        cy.confirmMetamaskPermissionToSpend({
          spendLimit: USDCAmountToSend.toString()
        }).then(() => {
          // eslint-disable-next-line
          cy.wait(40_000)
          cy.confirmMetamaskTransaction().then(() => {
            cy.findByText('Pending transactions').should('be.visible') // tx history should be opened
            cy.findByText(
              `${formatAmount(USDCAmountToSend, {
                symbol: 'USDC'
              })}`
            ).should('be.visible')

            // open the tx details popup
            cy.findAllByLabelText('Transaction details button')
              .first()
              .click()
              .then(() => {
                cy.findByText('Transaction details').should('be.visible')

                cy.findByText(/CUSTOM ADDRESS/i).should('be.visible')

                // custom destination label in pending tx history should be visible
                cy.findByLabelText(
                  `Custom address: ${shortenAddress(
                    Cypress.env('CUSTOM_DESTINATION_ADDRESS')
                  )}`
                ).should('be.visible')
              })

            // close popup
            cy.findByLabelText('Close transaction details popup').click()
          })
        })
      })
    })
  })
})
