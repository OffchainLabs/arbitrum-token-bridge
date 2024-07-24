/**
 * When user wants to bridge ETH from L2 to L1
 */

import { getL1NetworkConfig, zeroToLessThanOneETH } from '../../support/common'
import { formatAmount } from '../../../src/util/NumberUtils'

describe('Withdraw ETH', () => {
  const ETHToWithdraw = Number((Math.random() * 0.001).toFixed(5)) // randomize the amount to be sure that previous transactions are not checked in e2e

  // Happy Path
  context('user has some ETH and is on L2', () => {
    it('should show form fields correctly', () => {
      cy.login({ networkType: 'L2' })
      cy.findSourceChainButton('Arbitrum Local')
      cy.findDestinationChainButton('Ethereum Local')

      cy.findByRole('button', {
        name: /Move funds to Ethereum/i
      })
        .should('be.visible')
        .should('be.disabled')
    })

    context("bridge amount is lower than user's L2 ETH balance value", () => {
      it('should show gas estimations', () => {
        cy.login({ networkType: 'L2' })
        cy.typeAmount(ETHToWithdraw)
          //
          .then(() => {
            cy.findByText('You will pay in gas fees:')
              .siblings()
              .last()
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

      it(
        'should show withdrawal confirmation and withdraw',
        { defaultCommandTimeout: 60_000 },
        () => {
          cy.login({ networkType: 'L2' })
          cy.typeAmount(ETHToWithdraw)
            //
            .then(() => {
              cy.findByRole('button', {
                name: /Move funds to Ethereum/i
              })
                .should('be.visible')
                .should('be.enabled')
                .click()
              cy.findByText(/Arbitrum’s bridge/i).should('be.visible')

              // the Continue withdrawal button should be disabled at first
              cy.findByRole('button', {
                name: /Continue/i
              }).should('be.disabled')

              cy.findByRole('switch', {
                name: /before I can claim my funds/i
              })
                .should('be.visible')
                .click()

              cy.findByRole('switch', {
                name: /after claiming my funds/i
              })
                .should('be.visible')
                .click()
                .then(() => {
                  // the Continue withdrawal button should not be disabled now
                  cy.findByRole('button', {
                    name: /Continue/i
                  })
                    .should('be.enabled')
                    .click()
                    .then(() => {
                      cy.confirmMetamaskTransaction().then(() => {
                        cy.findAllByText(/an hour/i)
                          .first()
                          .should('be.visible')
                        cy.findAllByText(
                          `${formatAmount(ETHToWithdraw, {
                            symbol: 'ETH'
                          })}`
                        )
                          .first()
                          .should('be.visible')

                        cy.waitUntil(
                          () =>
                            cy
                              .findByLabelText(
                                `Claim ${formatAmount(ETHToWithdraw, {
                                  symbol: 'ETH'
                                })}`
                              )
                              .should('be.visible')
                              .should('not.be.disabled'),
                          {
                            errorMsg:
                              'Claim Transaction button is not visible or enabled',
                            timeout: 60_000,
                            interval: 1000
                          }
                        ).then(() => {
                          cy.changeMetamaskNetwork(
                            getL1NetworkConfig().networkName
                          ).then(() => {
                            cy.findByLabelText(
                              `Claim ${formatAmount(ETHToWithdraw, {
                                symbol: 'ETH'
                              })}`
                            )
                              .click()
                              .then(() => {
                                cy.confirmMetamaskTransaction().then(() => {
                                  cy.findByLabelText(
                                    'show settled transactions'
                                  )
                                    .should('be.visible')
                                    .click()

                                  cy.findAllByText(
                                    `${formatAmount(ETHToWithdraw, {
                                      symbol: 'ETH'
                                    })}`
                                  )
                                    .first()
                                    .should('be.visible')
                                })
                              })
                          })
                        })
                      })
                    })
                })
            })
        }
      )
    })

    // TODO => test for bridge amount higher than user's L2 ETH balance
  })

  // TODO - will have both cases:
  // 1. Arbitrum network is not added to metamask yet (add + switch)
  // 2. Arbitrum network already configured in metamask (only switch)
  context('user has some ETH and is on L1', () => {})
  // TODO
  context('user has some ETH and is on wrong chain', () => {})
  // TODO
  context('user has 0 ETH and is on L1', () => {})
  // TODO
  context('user has 0 ETH and is on L2', () => {})
  // TODO
  context('user has 0 ETH and is on wrong chain', () => {})
})
