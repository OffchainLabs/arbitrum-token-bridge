/**
 * When user enters the page with query params on URL
 */

import { formatAmount } from '../../../src/util/NumberUtils'
import { getInitialETHBalance } from '../../support/common'

describe('User enters site with query params on URL', () => {
  let l1ETHbal: number
  // when all of our tests need to run in a logged-in state
  // we have to make sure we preserve a healthy LocalStorage state
  // because it is cleared between each `it` cypress test
  before(() => {
    getInitialETHBalance(
      Cypress.env('ETH_RPC_URL'),
      Cypress.env('ADDRESS')
    ).then(val => (l1ETHbal = parseFloat(formatAmount(val, { decimals: 18 }))))
    cy.login({ networkType: 'L1' })
  })

  it('should correctly populate amount input from query param', () => {
    // only ETH is supported for now so by default the following tests are assumed to be ETH
    context(
      '?amount=max should set transfer panel amount to maximum amount possible based on balance',
      () => {
        cy.visit('/', { qs: { amount: 'max' } })

        cy.findByPlaceholderText(/Enter amount/i)
          .should('be.visible')
          .should('not.have.text', 'max')
          .should('not.have.text', 'MAX')
          // it's very hard to get the max amount separately
          // so this test only asserts the amount set for the input field is less than user's balance
          // but not the exact MAX AMOUNT set by the `setMaxAmount` function in `TransferPanelMain.tsx`
          .then(() => {
            cy.waitUntil(
              () =>
                cy
                  .findByPlaceholderText(/Enter amount/i)
                  .then($el => Number($el.val()) > 0),
              // optional timeouts and error messages
              {
                errorMsg:
                  'was expecting a numerical input value greater than 0',
                timeout: 5000,
                interval: 500
              }
            ).then(() => {
              cy.findByPlaceholderText(/Enter amount/i)
                .invoke('val')
                .then(value => {
                  cy.wrap(Number(value)).should('be.lt', l1ETHbal)
                })
            })
          })
      }
    )
    context(
      '?amount=MAX should set transfer panel amount to maximum amount possible based on balance',
      () => {
        cy.visit('/', { qs: { amount: 'MAX' } })

        cy.findByPlaceholderText(/Enter amount/i)
          .should('be.visible')
          .should('not.have.text', 'max')
          .should('not.have.text', 'MAX')
          // it's very hard to get the max amount separately
          // so this test only asserts the amount set for the input field is less than user's balance
          // but not the exact MAX AMOUNT set by the `setMaxAmount` function in `TransferPanelMain.tsx`
          .then(() => {
            cy.waitUntil(
              () =>
                cy
                  .findByPlaceholderText(/Enter amount/i)
                  .then($el => Number($el.val()) > 0),
              // optional timeouts and error messages
              {
                errorMsg:
                  'was expecting a numerical input value greater than 0',
                timeout: 5000,
                interval: 500
              }
            ).then(() => {
              cy.findByPlaceholderText(/Enter amount/i)
                .invoke('val')
                .then(value => {
                  cy.wrap(Number(value)).should('be.lt', l1ETHbal)
                })
            })
          })
      }
    )
    context(
      '?amount=MaX should set transfer panel amount to maximum amount possible based on balance',
      () => {
        cy.visit('/', { qs: { amount: 'MaX' } })

        cy.findByPlaceholderText(/Enter amount/i)
          .should('be.visible')
          .should('not.have.text', 'max')
          .should('not.have.text', 'MAX')
          .should('not.have.text', 'MaX')
          // it's very hard to get the max amount separately
          // so this test only asserts the amount set for the input field is less than user's balance
          // but not the exact MAX AMOUNT set by the `setMaxAmount` function in `TransferPanelMain.tsx`
          .then(() => {
            cy.waitUntil(
              () =>
                cy
                  .findByPlaceholderText(/Enter amount/i)
                  .then($el => Number($el.val()) > 0),
              // optional timeouts and error messages
              {
                errorMsg:
                  'was expecting a numerical input value greater than 0',
                timeout: 5000,
                interval: 500
              }
            ).then(() => {
              cy.findByPlaceholderText(/Enter amount/i)
                .invoke('val')
                .then(value => {
                  cy.wrap(Number(value)).should('be.lt', l1ETHbal)
                })
            })
          })
      }
    )
    context('?amount=56 should set transfer panel amount to 56', () => {
      cy.visit('/', { qs: { amount: '56' } })

      cy.findByPlaceholderText(/Enter amount/i).should('have.value', '56')
    })
    context('?amount=1.6678 should set transfer panel amount to 1.6678', () => {
      cy.visit('/', { qs: { amount: '1.6678' } })

      cy.findByPlaceholderText(/Enter amount/i).should('have.value', '1.6678')
    })
    context('?amount=6 should set transfer panel amount to 6', () => {
      cy.visit('/', { qs: { amount: '6' } })

      cy.findByPlaceholderText(/Enter amount/i).should('have.value', '6')
    })
    context('?amount=0.123 should set transfer panel amount to 0.123', () => {
      cy.visit('/', { qs: { amount: '0.123' } })

      cy.url().should('include', 'amount=0.123')
      cy.findByPlaceholderText(/Enter amount/i).should('have.value', '0.123')
    })
    context('?amount=-0.123 should set transfer panel amount to 0.123', () => {
      cy.visit('/', { qs: { amount: '-0.123' } })

      cy.findByPlaceholderText(/Enter amount/i).should('have.value', '0.123')
    })
    it('?amount=asdfs should not set transfer panel amount', () => {
      cy.visit('/', { qs: { amount: 'asdfs' } })

      cy.findByPlaceholderText(/Enter amount/i).should('be.empty')
    })
    context('?amount=0 should set transfer panel amount to 0', () => {
      cy.visit('/', { qs: { amount: '0' } })

      cy.findByPlaceholderText(/Enter amount/i).should('have.value', '0')
    })
    context('?amount=0.0001 should set transfer panel amount to 0.0001', () => {
      cy.visit('/', { qs: { amount: '0.0001' } })

      cy.findByPlaceholderText(/Enter amount/i).should('have.value', '0.0001')
    })
    context('?amount=123,3,43 should not set transfer panel amount', () => {
      cy.visit('/', { qs: { amount: '123,3,43' } })

      cy.findByPlaceholderText(/Enter amount/i).should('be.empty')
    })
    context(
      '?amount=0, 123.222, 0.3 should not set transfer panel amount',
      () => {
        cy.visit('/', { qs: { amount: '0, 123.222, 0.3' } })

        cy.findByPlaceholderText(/Enter amount/i).should('be.empty')
      }
    )
  })
})
