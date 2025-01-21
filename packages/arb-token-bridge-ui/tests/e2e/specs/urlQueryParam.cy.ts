/**
 * When user enters the page with query params on URL
 */

import { formatAmount } from '../../../src/util/NumberUtils'
import {
  getInitialETHBalance,
  getL1NetworkName,
  getL2NetworkName,
  visitAfterSomeDelay
} from '../../support/common'

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
    cy.login({ networkType: 'parentChain' })
  })

  it('should correctly populate amount input from query param', () => {
    // only ETH is supported for now so by default the following tests are assumed to be ETH
    context(
      '?amount=max should set transfer panel amount to maximum amount possible based on balance',
      () => {
        visitAfterSomeDelay('/', {
          qs: {
            amount: 'max',
            sourceChain: getL1NetworkName(),
            destinationChain: getL2NetworkName()
          }
        })

        cy.findAmountInput()
          .should('be.visible')
          .should('not.have.text', 'max')
          .should('not.have.text', 'MAX')
        // it's very hard to get the max amount separately
        // so this test only asserts the amount set for the input field is less than user's balance
        // but not the exact MAX AMOUNT set by the `setMaxAmount` function in `TransferPanelMain.tsx`

        cy.findAmountInput().should($el => {
          const amount = parseFloat(String($el.val()))
          expect(amount).to.be.gt(0)
        })
        cy.findAmountInput().should($el => {
          const amount = parseFloat(String($el.val()))
          expect(amount).to.be.lt(Number(l1ETHbal))
        })
      }
    )
    context(
      '?amount=MAX should set transfer panel amount to maximum amount possible based on balance',
      () => {
        visitAfterSomeDelay('/', {
          qs: {
            amount: 'MAX',
            sourceChain: getL1NetworkName(),
            destinationChain: getL2NetworkName()
          }
        })

        cy.findAmountInput()
          .should('be.visible')
          .should('not.have.text', 'max')
          .should('not.have.text', 'MAX')
        // it's very hard to get the max amount separately
        // so this test only asserts the amount set for the input field is less than user's balance
        // but not the exact MAX AMOUNT set by the `setMaxAmount` function in `TransferPanelMain.tsx`
        cy.waitUntil(
          () => cy.findAmountInput().then($el => Number(String($el.val())) > 0),
          // optional timeouts and error messages
          {
            errorMsg: 'was expecting a numerical input value greater than 0',
            timeout: 5000,
            interval: 500
          }
        )
        cy.findAmountInput().should($el => {
          const amount = parseFloat(String($el.val()))
          expect(amount).to.be.lt(Number(l1ETHbal))
        })
      }
    )
    context(
      '?amount=MaX should set transfer panel amount to maximum amount possible based on balance',
      () => {
        visitAfterSomeDelay('/', {
          qs: {
            amount: 'MaX',
            sourceChain: getL1NetworkName(),
            destinationChain: getL2NetworkName()
          }
        })

        cy.findAmountInput()
          .should('be.visible')
          .should('not.have.text', 'max')
          .should('not.have.text', 'MAX')
          .should('not.have.text', 'MaX')
        // it's very hard to get the max amount separately
        // so this test only asserts the amount set for the input field is less than user's balance
        // but not the exact MAX AMOUNT set by the `setMaxAmount` function in `TransferPanelMain.tsx`
        cy.waitUntil(
          () =>
            cy.findAmountInput().should($el => {
              const amount = parseFloat(String($el.val()))
              expect(amount).to.be.gt(0)
            }),
          // optional timeouts and error messages
          {
            errorMsg: 'was expecting a numerical input value greater than 0',
            timeout: 5000,
            interval: 500
          }
        )
        cy.findAmountInput().should($el => {
          const amount = parseFloat(String($el.val()))
          expect(amount).to.be.lt(Number(l1ETHbal))
        })
      }
    )
    context('?amount=56 should set transfer panel amount to 56', () => {
      visitAfterSomeDelay('/', {
        qs: {
          amount: '56',
          sourceChain: getL1NetworkName(),
          destinationChain: getL2NetworkName()
        }
      })

      cy.findAmountInput().should('have.value', '56')
    })
    context('?amount=1.6678 should set transfer panel amount to 1.6678', () => {
      visitAfterSomeDelay('/', {
        qs: {
          amount: '1.6678',
          sourceChain: getL1NetworkName(),
          destinationChain: getL2NetworkName()
        }
      })

      cy.findAmountInput().should('have.value', '1.6678')
    })
    context('?amount=6 should set transfer panel amount to 6', () => {
      visitAfterSomeDelay('/', {
        qs: {
          amount: '6',
          sourceChain: getL1NetworkName(),
          destinationChain: getL2NetworkName()
        }
      })

      cy.findAmountInput().should('have.value', '6')
    })
    context('?amount=0.123 should set transfer panel amount to 0.123', () => {
      visitAfterSomeDelay('/', {
        qs: {
          amount: '0.123',
          sourceChain: getL1NetworkName(),
          destinationChain: getL2NetworkName()
        }
      })

      cy.url().should('include', 'amount=0.123')
      cy.findAmountInput().should('have.value', '0.123')
    })
    context('?amount=-0.123 should set transfer panel amount to 0.123', () => {
      visitAfterSomeDelay('/', {
        qs: {
          amount: '-0.123',
          sourceChain: getL1NetworkName(),
          destinationChain: getL2NetworkName()
        }
      })

      cy.findAmountInput().should('have.value', '0.123')
    })
    it('?amount=asdfs should not set transfer panel amount', () => {
      visitAfterSomeDelay('/', {
        qs: {
          amount: 'asdfs',
          sourceChain: getL1NetworkName(),
          destinationChain: getL2NetworkName()
        }
      })

      cy.findAmountInput().should('be.empty')
    })
    context('?amount=0 should set transfer panel amount to 0', () => {
      visitAfterSomeDelay('/', {
        qs: {
          amount: '0',
          sourceChain: getL1NetworkName(),
          destinationChain: getL2NetworkName()
        }
      })

      cy.findAmountInput().should('have.value', '0')
    })
    context('?amount=0.0001 should set transfer panel amount to 0.0001', () => {
      visitAfterSomeDelay('/', {
        qs: {
          amount: '0.0001',
          sourceChain: getL1NetworkName(),
          destinationChain: getL2NetworkName()
        }
      })

      cy.findAmountInput().should('have.value', '0.0001')
    })
    context('?amount=123,3,43 should not set transfer panel amount', () => {
      visitAfterSomeDelay('/', {
        qs: {
          amount: '123,3,43',
          sourceChain: getL1NetworkName(),
          destinationChain: getL2NetworkName()
        }
      })

      cy.findAmountInput().should('be.empty')
    })
    context(
      '?amount=0, 123.222, 0.3 should not set transfer panel amount',
      () => {
        visitAfterSomeDelay('/', {
          qs: {
            amount: '0, 123.222, 0.3',
            sourceChain: getL1NetworkName(),
            destinationChain: getL2NetworkName()
          }
        })

        cy.findAmountInput().should('be.empty')
      }
    )
  })
})

// TODO: Test amount2 when query params e2e is added back
