/**
 * When user enters the page with query params on URL
 */

import { ethers } from 'ethers'

import { formatAmount } from '../../../src/util/NumberUtils'
import { getInitialETHBalance } from '../../support/common'

function formatBalance(value: string | number | string[]) {
  return parseFloat(
    formatAmount(ethers.utils.parseUnits(String(value), 'ether'), {
      decimals: 18
    })
  )
}

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
  })

  beforeEach(() => {
    cy.login({
      networkType: 'L1',
      query: {
        sourceChain: 'custom-localhost',
        destinationChain: 'arbitrum-localhost'
      }
    })
  })

  // only ETH is supported for now so by default the following tests are assumed to be ETH
  context(
    'set transfer panel amount to maximum amount possible based on balance',
    () => {
      it('?amount=max', () => {
        cy.visit(
          '/?amount=max&sourceChain=custom-localhost&destinationChain=arbitrum-localhost'
        )

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
                  cy.wrap(formatBalance(value)).should('be.lte', l1ETHbal)
                })
            })
          })
      })
    }
  )

  context(
    'set transfer panel amount to maximum amount possible based on balance',
    () => {
      it('?amount=MAX', () => {
        cy.visit(
          '/?amount=MAX&sourceChain=custom-localhost&destinationChain=arbitrum-localhost'
        )

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
                  cy.wrap(formatBalance(value)).should('be.lte', l1ETHbal)
                })
            })
          })
      })
    }
  )

  context(
    'set transfer panel amount to maximum amount possible based on balance',
    () => {
      it('?amount=MaX', () => {
        cy.visit(
          '/?amount=MaX&sourceChain=custom-localhost&destinationChain=arbitrum-localhost'
        )

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
                  cy.wrap(formatBalance(value)).should('be.lte', l1ETHbal)
                })
            })
          })
      })
    }
  )

  context('set transfer panel amount to specific amount', () => {
    it('?amount=56', () => {
      cy.visit(
        '/?amount=56&sourceChain=custom-localhost&destinationChain=arbitrum-localhost'
      )

      cy.findByPlaceholderText(/Enter amount/i).should('have.value', '56')
    })
  })

  context('set transfer panel amount to specific amount', () => {
    it('?amount=1.6678', () => {
      cy.visit(
        '/?amount=1.6678&sourceChain=custom-localhost&destinationChain=arbitrum-localhost'
      )

      cy.findByPlaceholderText(/Enter amount/i).should('have.value', '1.6678')
    })
  })

  context('set transfer panel amount to specific amount', () => {
    it('?amount=6', () => {
      cy.visit(
        '/?amount=6&sourceChain=custom-localhost&destinationChain=arbitrum-localhost'
      )

      cy.findByPlaceholderText(/Enter amount/i).should('have.value', '6')
    })
  })

  context('set transfer panel amount to specific amount', () => {
    it('?amount=0.123', () => {
      cy.visit(
        '/?amount=0.123&sourceChain=custom-localhost&destinationChain=arbitrum-localhost'
      )

      cy.url().should('include', 'amount=0.123')
      cy.findByPlaceholderText(/Enter amount/i).should('have.value', '0.123')
    })
  })

  context('set transfer panel amount to specific amount', () => {
    it('?amount=-0.123', () => {
      cy.visit(
        '/?amount=-0.123&sourceChain=custom-localhost&destinationChain=arbitrum-localhost'
      )

      cy.findByPlaceholderText(/Enter amount/i).should('have.value', '0.123')
    })
  })

  context('set transfer panel amount to specific amount', () => {
    it('?amount=0', () => {
      cy.visit(
        '/?amount=0&sourceChain=custom-localhost&destinationChain=arbitrum-localhost'
      )

      cy.findByPlaceholderText(/Enter amount/i).should('have.value', '0')
    })
  })

  context('set transfer panel amount to specific amount', () => {
    it('?amount=0.0001', () => {
      cy.visit(
        '/?amount=0.0001&sourceChain=custom-localhost&destinationChain=arbitrum-localhost'
      )

      cy.findByPlaceholderText(/Enter amount/i).should('have.value', '0.0001')
    })
  })

  context('not set transfer panel amount to specific amount', () => {
    it('?amount=asdfs', () => {
      cy.visit(
        '/?amount=asdfs&sourceChain=custom-localhost&destinationChain=arbitrum-localhost'
      )

      cy.findByPlaceholderText(/Enter amount/i).should('be.empty')
    })
  })

  context('not set transfer panel amount to specific amount', () => {
    it('?amount=123,3,43', () => {
      cy.visit(
        '/?amount=123,3,43&sourceChain=custom-localhost&destinationChain=arbitrum-localhost'
      )

      cy.findByPlaceholderText(/Enter amount/i).should('be.empty')
    })
  })

  context('not set transfer panel amount to specific amount', () => {
    it('?amount=0, 123.222, 0.3', () => {
      cy.visit(
        '/?amount=0, 123.222, 0.3&sourceChain=custom-localhost&destinationChain=arbitrum-localhost'
      )

      cy.findByPlaceholderText(/Enter amount/i).should('be.empty')
    })
  })
})
