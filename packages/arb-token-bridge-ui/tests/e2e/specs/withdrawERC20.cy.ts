/**
 * When user wants to bridge ERC20 from L2 to L1
 */

import { formatAmount } from '../../../src/util/NumberUtils'
import { wethTokenAddressL2, zeroToLessThanOneETH } from '../../support/common'

describe('Withdraw ERC20 Token', () => {
  // when all of our tests need to run in a logged-in state
  // we have to make sure we preserve a healthy LocalStorage state
  // because it is cleared between each `it` cypress test

  const ERC20ToWithdraw = 0.0001

  // Happy Path
  context('User is on L2 and imports ERC-20', () => {
    it('should show form fields correctly', () => {
      cy.login({ networkType: 'L2' })
      cy.findByRole('button', { name: /From: Arbitrum/i }).should('be.visible')
      cy.findByRole('button', { name: /To: Ethereum/i }).should('be.visible')

      cy.findByRole('button', {
        name: /Move funds to Ethereum/i
      })
        .should('be.visible')
        .should('be.disabled')

      cy.findByRole('button', { name: 'Select Token' })
        .should('be.visible')
        .should('have.text', 'ETH')
    })

    it('should withdraw ERC-20 successfully', () => {
      cy.login({ networkType: 'L2' })
      context('should add ERC-20 correctly', () => {
        // Click on the ETH dropdown (Select token button)
        cy.findByRole('button', { name: 'Select Token' })
          .should('be.visible')
          .should('have.text', 'ETH')
          .click()

        // open the Select Token popup
        cy.findByPlaceholderText(/Search by token name/i)
          .should('be.visible')
          .typeRecursively(wethTokenAddressL2)
          .then(() => {
            // Click on the Add new token button
            cy.findByRole('button', { name: 'Add New Token' })
              .should('be.visible')
              .click()

            // Select the WETH token
            cy.findAllByText('WETH').first().click()

            // WETH token should be selected now and popup should be closed after selection
            cy.findByRole('button', { name: 'Select Token' })
              .should('be.visible')
              .should('have.text', 'WETH')
          })
      })

      context('should show summary', () => {
        cy.findByPlaceholderText('Enter amount')
          .typeRecursively(String(ERC20ToWithdraw))
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

      context('should show clickable withdraw button', () => {
        cy.findByRole('button', {
          name: /Move funds to Ethereum/i
        })
          .scrollIntoView()
          .should('be.visible')
          .should('be.enabled')
          .click()
      })

      context('should withdraw successfully', () => {
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

            cy.confirmMetamaskTransaction().then(() => {
              cy.findByText('an hour').should('be.visible')
              cy.findByText(
                `${formatAmount(ERC20ToWithdraw, {
                  symbol: 'WETH'
                })}`
              ).should('be.visible')
            })
          })
      })
    })

    // TODO => test for bridge amount higher than user's L2 ERC20 balance
  })

  // TODO - will have both cases:
  // 1. Arbitrum network is not added to metamask yet (add + switch)
  // 2. Arbitrum network already configured in metamask (only switch)
  context('user has some L2-ERC20 and is on L1', () => {})
  // TODO
  context('user has some L2-ERC20 and is on wrong chain', () => {})
  // TODO
  context('user has 0 L2-ERC20 and is on L1', () => {})
  // TODO
  context('user has 0 L2-ERC20 and is on L2', () => {})
  // TODO
  context('user has 0 L2-ERC20 and is on wrong chain', () => {})
  // TODO
  context(
    'user has some LPT tokens which require token approval permission and is on L2',
    () => {}
  )
})
