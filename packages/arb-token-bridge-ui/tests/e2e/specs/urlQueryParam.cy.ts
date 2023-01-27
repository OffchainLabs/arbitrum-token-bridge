/**
 * When user enters the page with query params on URL
 */

import { formatAmount } from '../../../src/util/NumberUtils'
import { resetSeenTimeStampCache } from '../../support/commands'
import { getInitialETHBalance, ethRpcUrl } from '../../support/common'

describe('User enters site with query params on URL', () => {
  // we fund another wallet with small amount of eth so we test on realistic numbers
  const ethToFund = 127.345
  let l1ETHbal: number
  // when all of our tests need to run in a logged-in state
  // we have to make sure we preserve a healthy LocalStorage state
  // because it is cleared between each `it` cypress test
  before(() => {
    cy.sendEth(2, 1, ethToFund)
    cy.switchMetamaskAccount(1)
    cy.getMetamaskWalletAddress().then(address => {
      getInitialETHBalance(ethRpcUrl, address).then(
        val => (l1ETHbal = parseFloat(formatAmount(val, { decimals: 18 })))
      )
      // before this spec, make sure the cache is fresh
      // otherwise pending transactions from last ran specs will leak in this
      resetSeenTimeStampCache()
      // log in to metamask before test
      cy.login('L1')
      // save state once otherwise `restoreAppState` in beforeEach would clear it
      cy.saveAppState()
    })
  })
  after(() => {
    // after all assertions are executed, logout and reset the account
    cy.logout()
  })
  beforeEach(() => {
    cy.restoreAppState()
  })
  afterEach(() => {
    cy.saveAppState()
  })
  context('User has ETH on the smaller account', () => {
    it('displays correct balance based on funded eth', () => {
      cy.findByText(
        `Balance: ${formatAmount(ethToFund, { symbol: 'ETH' })}`
      ).should('be.visible')
    })
  })

  context('Amount query param', () => {
    // only ETH is supported for now so by default the following tests are assumed to be ETH
    it('?amount=max should set transfer panel amount to maximum amount possible based on balance', () => {
      cy.visit('/', {
        qs: {
          amount: 'max'
        }
      })

      cy.findByPlaceholderText(/Enter amount/i)
        .should('be.visible')
        .should('not.have.text', 'max')
        .should('not.have.text', 'MAX')
        // it's very hard to get the max amount separately
        // so this test only asserts the amount set for the input field is less than user's balance
        // but not the exact MAX AMOUNT set by the `setMaxAmount` function in `TransferPanelMain.tsx`
        .invoke('val')
        .then(initialValue => {
          cy.waitUntil(
            () =>
              cy
                .findByPlaceholderText(/Enter amount/i)
                .then($el => $el.val() !== initialValue),
            // optional timeouts and error messages
            {
              errorMsg:
                'was expecting some other Value but got : ' + initialValue,
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
      cy.visit('/', {
        qs: {
          amount: 'MAX'
        }
      })

      cy.findByPlaceholderText(/Enter amount/i)
        .should('be.visible')
        .should('not.have.text', 'max')
        .should('not.have.text', 'MAX')
        // it's very hard to get the max amount separately
        // so this test only asserts the amount set for the input field is less than user's balance
        // but not the exact MAX AMOUNT set by the `setMaxAmount` function in `TransferPanelMain.tsx`
        .invoke('val')
        .then(initialValue => {
          cy.waitUntil(
            () =>
              cy
                .findByPlaceholderText(/Enter amount/i)
                .then($el => $el.val() !== initialValue),
            // optional timeouts and error messages
            {
              errorMsg:
                'was expecting some other Value but got : ' + initialValue,
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
      cy.visit('/', {
        qs: {
          amount: 'MaX'
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
        .invoke('val')
        .then(initialValue => {
          cy.waitUntil(
            () =>
              cy
                .findByPlaceholderText(/Enter amount/i)
                .then($el => $el.val() !== initialValue),
            // optional timeouts and error messages
            {
              errorMsg:
                'was expecting some other Value but got : ' + initialValue,
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
      cy.visit('/', {
        qs: {
          amount: '56'
        }
      })

      cy.findByPlaceholderText(/Enter amount/i).should('have.value', '56')
    })
    it('?amount=1.6678 should set transfer panel amount to 1.6678', () => {
      cy.visit('/', {
        qs: {
          amount: '1.6678'
        }
      })

      cy.findByPlaceholderText(/Enter amount/i).should('have.value', '1.6678')
    })
    it('?amount=6 should set transfer panel amount to 6', () => {
      cy.visit('/', {
        qs: {
          amount: '6'
        }
      })

      cy.findByPlaceholderText(/Enter amount/i).should('have.value', '6')
    })
    it('?amount=0.123 should set transfer panel amount to 0.123', () => {
      cy.visit('/', {
        qs: {
          amount: '0.123'
        }
      })

      cy.url().should('include', 'amount=0.123')
      cy.findByPlaceholderText(/Enter amount/i).should('have.value', '0.123')
    })
    it('?amount=-0.123 should set transfer panel amount to 0.123', () => {
      cy.visit('/', {
        qs: {
          amount: '-0.123'
        }
      })

      cy.findByPlaceholderText(/Enter amount/i).should('have.value', '0.123')
    })
    it('?amount=asdfs should not set transfer panel amount', () => {
      cy.visit('/', {
        qs: {
          amount: 'asdfs'
        }
      })

      cy.findByPlaceholderText(/Enter amount/i).should('be.empty')
    })
    it('?amount=0 should set transfer panel amount to 0', () => {
      cy.visit('/', {
        qs: {
          amount: '0'
        }
      })

      cy.findByPlaceholderText(/Enter amount/i).should('have.value', '0')
    })
    it('?amount=0.00001 should set transfer panel amount to 0.00001', () => {
      cy.visit('/', {
        qs: {
          amount: '0.00001'
        }
      })

      cy.findByPlaceholderText(/Enter amount/i).should('have.value', '0.00001')
    })
    it('?amount=123,3,43 should not set transfer panel amount', () => {
      cy.visit('/', {
        qs: {
          amount: '123,3,43'
        }
      })

      cy.findByPlaceholderText(/Enter amount/i).should('be.empty')
    })
    it('?amount=0, 123.222, 0.3 should not set transfer panel amount', () => {
      cy.visit('/', {
        qs: {
          amount: '0, 123.222, 0.3'
        }
      })

      cy.findByPlaceholderText(/Enter amount/i).should('be.empty')
    })
  })
})
