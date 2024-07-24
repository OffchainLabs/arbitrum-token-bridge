/**
 * When user wants to bridge ERC20 from L1 to L2
 */

import { formatAmount } from '../../../src/util/NumberUtils'
import {
  getInitialERC20Balance,
  getL1NetworkConfig,
  zeroToLessThanOneETH,
  wethTokenAddressL1,
  wethTokenAddressL2,
  ERC20TokenSymbol
} from '../../support/common'
import { shortenAddress } from '../../../src/util/CommonUtils'

const { _ } = Cypress

const moreThanZeroBalance = /0(\.\d+)/

const depositTestCases = {
  'Standard ERC20': {
    symbol: ERC20TokenSymbol,
    l1Address: Cypress.env('ERC20_TOKEN_ADDRESS_L1'),
    l2Address: Cypress.env('ERC20_TOKEN_ADDRESS_L2')
  },
  WETH: {
    symbol: 'WETH',
    l1Address: wethTokenAddressL1,
    l2Address: wethTokenAddressL2
  }
}

describe('Deposit Token', () => {
  // when all of our tests need to run in a logged-in state
  // we have to make sure we preserve a healthy LocalStorage state
  // because it is cleared between each `it` cypress test

  it('should show L1 and L2 chains, and ETH correctly', () => {
    cy.login({ networkType: 'L1' })
    cy.findByRole('button', { name: /From: Ethereum/i }).should('be.visible')
    cy.findByRole('button', { name: /To: Arbitrum/i }).should('be.visible')
    cy.findByRole('button', { name: 'Select Token' })
      .should('be.visible')
      .should('have.text', 'ETH')
  })

  // Happy Path

  _.each(depositTestCases, (testCase, tokenType) => {
    context(`User has some ${tokenType} and is on L1`, () => {
      let l1ERC20bal: string

      beforeEach(() => {
        getInitialERC20Balance({
          tokenAddress: testCase.l1Address,
          multiCallerAddress: getL1NetworkConfig().multiCall,
          address: Cypress.env('ADDRESS'),
          rpcURL: Cypress.env('ETH_RPC_URL')
        }).then(val => (l1ERC20bal = formatAmount(val)))
      })

      it(`should deposit ${tokenType} successfully to the same address`, () => {
        const ERC20AmountToSend = Number((Math.random() * 0.001).toFixed(5)) // randomize the amount to be sure that previous transactions are not checked in e2e

        cy.login({ networkType: 'L1' })
        context(`should add a new ${tokenType} token`, () => {
          cy.searchAndSelectToken({
            tokenName: testCase.symbol,
            tokenAddress: testCase.l1Address
          })
        })

        context(`should show ${tokenType} balance correctly`, () => {
          cy.findByLabelText(`${testCase.symbol} balance amount on l1`)
            .should('be.visible')
            .contains(l1ERC20bal)
            .should('be.visible')
        })

        context('should show gas estimations', () => {
          cy.findByPlaceholderText('Enter amount')
            .typeRecursively(String(ERC20AmountToSend))
            .then(() => {
              cy.findByText('You will pay in gas fees:')
                .siblings()
                .last()
                .contains(zeroToLessThanOneETH)
                .should('be.visible')
              cy.findByText('Ethereum Local gas fee')
                .parent()
                .siblings()
                .contains(zeroToLessThanOneETH)
                .should('be.visible')
              cy.findByText('Arbitrum Local gas fee')
                .parent()
                .siblings()
                .contains(zeroToLessThanOneETH)
                .should('be.visible')
            })
        })

        context('should deposit successfully', () => {
          cy.findByRole('button', {
            name: /Move funds to Arbitrum Local/i
          })
            .scrollIntoView()
            .should('be.visible')
            .should('be.enabled')
            .click()
            .then(() => {
              cy.confirmMetamaskTransaction().then(() => {
                cy.findByText('10 minutes').should('be.visible')
                cy.findByText(
                  `${formatAmount(ERC20AmountToSend, {
                    symbol: testCase.symbol
                  })}`
                ).should('be.visible')
              })
            })
        })
      })

      it(
        `should deposit ${tokenType} to custom destination address successfully`,
        {
          defaultCommandTimeout: 60000
        },
        () => {
          const ERC20AmountToSend = Number((Math.random() * 0.001).toFixed(5)) // randomize the amount to be sure that previous transactions are not checked in e2e

          cy.login({ networkType: 'L1' })
          context('should add a new token', () => {
            cy.searchAndSelectToken({
              tokenName: testCase.symbol,
              tokenAddress: testCase.l1Address
            })
          })

          context('should show summary', () => {
            cy.findByPlaceholderText('Enter amount')
              .typeRecursively(String(ERC20AmountToSend))
              .then(() => {
                cy.findByText('You will pay in gas fees:')
                  .siblings()
                  .last()
                  .contains(zeroToLessThanOneETH)
                  .should('be.visible')
              })
          })

          context('should fill custom destination address successfully', () => {
            cy.fillCustomDestinationAddress()
          })

          context('should deposit successfully', () => {
            cy.findByRole('button', {
              name: /Move funds to Arbitrum Local/i
            })
              .scrollIntoView()
              .should('be.visible')
              .should('be.enabled')
              .click()
              .then(() => {
                cy.confirmMetamaskTransaction().then(() => {
                  cy.findByText('10 minutes').should('be.visible')
                  cy.findByText(
                    `${formatAmount(ERC20AmountToSend, {
                      symbol: testCase.symbol
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

          context('deposit should complete successfully', () => {
            // switch to settled transactions
            cy.findByLabelText('show settled transactions')
              .should('be.visible')
              .click()

            //wait for some time for tx to go through and find the new amount in settled transactions
            cy.waitUntil(
              () =>
                cy
                  .findByText(
                    `${formatAmount(ERC20AmountToSend, {
                      symbol: testCase.symbol
                    })}`
                  )
                  .should('be.visible'),
              {
                errorMsg: `Could not find settled ${tokenType} Deposit transaction`,
                timeout: 60_000,
                interval: 500
              }
            ).then(() => {
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

          context('funds should reach destination account successfully', () => {
            // close transaction history
            cy.findByLabelText('Close side panel').click()

            // the custom destination address should now have some balance greater than zero
            cy.findByLabelText(`${testCase.symbol} balance amount on l2`)
              .contains(moreThanZeroBalance)
              .should('be.visible')

            // the balance on the source chain should not be the same as before
            cy.findByLabelText(`${testCase.symbol} balance amount on l1`)
              .should('be.visible')
              .its('text')
              .should('not.eq', l1ERC20bal)
          })
        }
      )
    })

    // TODO => test for bridge amount higher than user's L1 ERC20 balance
  })

  // TODO
  context('user has some L1-ERC20 and is on L2', () => {})
  // TODO
  context('user has some L1-ERC20 and is on wrong chain', () => {})
  // TODO
  context('user has 0 L1-ERC20 and is on L1', () => {})
  // TODO
  context('user has 0 L1-ERC20 and is on L2', () => {})
  // TODO
  context('user has 0 L1-ERC20 and is on wrong chain', () => {})
  // TODO
  context(
    'user has some ERC-20 tokens which require token approval permission and is on L1',
    () => {}
  )
  // TODO
  context('approve and send ERC-20 successfully', () => {})
})
