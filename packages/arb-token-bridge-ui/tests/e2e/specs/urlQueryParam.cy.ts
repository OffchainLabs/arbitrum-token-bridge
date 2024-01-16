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
  })

  // only ETH is supported for now so by default the following tests are assumed to be ETH
  it('?amount=max should set transfer panel amount to maximum amount possible based on balance', () => {
    cy.login({
      networkType: 'L1',
      query: {
        amount: 'max',
        sourceChain: 'custom-localhost',
        destinationChain: 'arbitrum-localhost'
      }
    })

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
            errorMsg: 'was expecting a numerical input value greater than 0',
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
  })

  it('?amount=MAX should set transfer panel amount to maximum amount possible based on balance', () => {
    cy.login({
      networkType: 'L1',
      query: {
        amount: 'MAX',
        sourceChain: 'custom-localhost',
        destinationChain: 'arbitrum-localhost'
      }
    })

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
            errorMsg: 'was expecting a numerical input value greater than 0',
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
  })

  it('?amount=MaX should set transfer panel amount to maximum amount possible based on balance', () => {
    cy.login({
      networkType: 'L1',
      query: {
        amount: 'MaX',
        sourceChain: 'custom-localhost',
        destinationChain: 'arbitrum-localhost'
      }
    })

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
            errorMsg: 'was expecting a numerical input value greater than 0',
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
  })

  it('?amount=56 should set transfer panel amount to 56', () => {
    cy.login({
      networkType: 'L1',
      query: {
        amount: '56',
        sourceChain: 'custom-localhost',
        destinationChain: 'arbitrum-localhost'
      }
    })

    cy.findByPlaceholderText(/Enter amount/i).should('have.value', '56')
  })

  it('?amount=1.6678 should set transfer panel amount to 1.6678', () => {
    cy.login({
      networkType: 'L1',
      query: {
        amount: '1.6678',
        sourceChain: 'custom-localhost',
        destinationChain: 'arbitrum-localhost'
      }
    })

    cy.findByPlaceholderText(/Enter amount/i).should('have.value', '1.6678')
  })

  it('?amount=6 should set transfer panel amount to 6', () => {
    cy.login({
      networkType: 'L1',
      query: {
        amount: '6',
        sourceChain: 'custom-localhost',
        destinationChain: 'arbitrum-localhost'
      }
    })

    cy.findByPlaceholderText(/Enter amount/i).should('have.value', '6')
  })

  it('?amount=0.123 should set transfer panel amount to 0.123', () => {
    cy.login({
      networkType: 'L1',
      query: {
        amount: '0.123',
        sourceChain: 'custom-localhost',
        destinationChain: 'arbitrum-localhost'
      }
    })

    cy.url().should('include', 'amount=0.123')
    cy.findByPlaceholderText(/Enter amount/i).should('have.value', '0.123')
  })

  it('?amount=-0.123 should set transfer panel amount to 0.123', () => {
    cy.login({
      networkType: 'L1',
      query: {
        amount: '-0.123',
        sourceChain: 'custom-localhost',
        destinationChain: 'arbitrum-localhost'
      }
    })

    cy.findByPlaceholderText(/Enter amount/i).should('have.value', '0.123')
  })

  it('?amount=asdfs should not set transfer panel amount', () => {
    cy.login({
      networkType: 'L1',
      query: {
        amount: 'asdfs',
        sourceChain: 'custom-localhost',
        destinationChain: 'arbitrum-localhost'
      }
    })

    cy.findByPlaceholderText(/Enter amount/i).should('be.empty')
  })

  it('?amount=0 should set transfer panel amount to 0', () => {
    cy.login({
      networkType: 'L1',
      query: {
        amount: '0',
        sourceChain: 'custom-localhost',
        destinationChain: 'arbitrum-localhost'
      }
    })

    cy.findByPlaceholderText(/Enter amount/i).should('have.value', '0')
  })

  it('?amount=0.0001 should set transfer panel amount to 0.0001', () => {
    cy.login({
      networkType: 'L1',
      query: {
        amount: '0.0001',
        sourceChain: 'custom-localhost',
        destinationChain: 'arbitrum-localhost'
      }
    })

    cy.findByPlaceholderText(/Enter amount/i).should('have.value', '0.0001')
  })

  it('?amount=123,3,43 should not set transfer panel amount', () => {
    cy.login({
      networkType: 'L1',
      query: {
        amount: '123,3,43',
        sourceChain: 'custom-localhost',
        destinationChain: 'arbitrum-localhost'
      }
    })

    cy.findByPlaceholderText(/Enter amount/i).should('be.empty')
  })

  it('?amount=0, 123.222, 0.3 should not set transfer panel amount', () => {
    cy.login({
      networkType: 'L1',
      query: {
        amount: '0, 123.222, 0.3',
        sourceChain: 'custom-localhost',
        destinationChain: 'arbitrum-localhost'
      }
    })

    cy.findByPlaceholderText(/Enter amount/i).should('be.empty')
  })
})
