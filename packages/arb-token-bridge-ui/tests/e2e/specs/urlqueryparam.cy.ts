/**
 * When user enters the page with query params on URL
 */

import { resetSeenTimeStampCache } from '../../support/commands'

describe('User enters site with query params on URL', () => {
  // when all of our tests need to run in a logged-in state
  // we have to make sure we preserve a healthy LocalStorage state
  // because it is cleared between each `it` cypress test
  before(() => {
    // before this spec, make sure the cache is fresh
    // otherwise pending transactions from last ran specs will leak in this
    resetSeenTimeStampCache()
  })

  beforeEach(() => {
    cy.restoreAppState()
  })
  afterEach(() => {
    cy.saveAppState()
  })
  context('Amount query param', () => {
    // log in to metamask before test
    before(() => {
      cy.login('L1')
    })

    after(() => {
      // after all assertions are executed, logout and reset the account
      cy.logout()
    })

    // only ETH is supported for now so by default the following tests are assumed to be ETH
    it('?amount=max should set transfer panel amount to maximum amount possible based on balance', () => {
      cy.visit('/', {
        qs: {
          amount: 'max'
        }
      })
      cy.connectToApp()

      cy.findAllByPlaceholderText('Enter amount').should('not.have.text', 'max')
      cy.findAllByPlaceholderText('Enter amount').should('not.have.text', 'MAX')
      // TODO -> get possible max value
      cy.findAllByPlaceholderText('Enter amount').should('have.value', '')
    })
    it('?amount=MAX should set transfer panel amount to maximum amount possible based on balance', () => {
      cy.visit('/', {
        qs: {
          amount: 'MAX'
        }
      })
      cy.connectToApp()

      cy.findAllByPlaceholderText('Enter amount').should('not.have.text', 'max')
      cy.findAllByPlaceholderText('Enter amount').should('not.have.text', 'MAX')
      // TODO -> get possible max value
      cy.findAllByPlaceholderText('Enter amount').should('have.value', '')
    })
    it('?amount=MaX should set transfer panel amount to maximum amount possible based on balance', () => {
      cy.visit('/', {
        qs: {
          amount: 'MaX'
        }
      })
      cy.connectToApp()

      cy.findAllByPlaceholderText('Enter amount').should('not.have.text', 'max')
      cy.findAllByPlaceholderText('Enter amount').should('not.have.text', 'MAX')
      cy.findAllByPlaceholderText('Enter amount').should('not.have.text', 'MaX')
      // TODO -> get possible max value
      cy.findAllByPlaceholderText('Enter amount').should('have.value', '')
    })
    it('?amount=56 should set transfer panel amount to 56', () => {
      cy.visit('/', {
        qs: {
          amount: '56'
        }
      })
      cy.connectToApp()
      cy.findAllByPlaceholderText('Enter amount').should('have.value', '56')
    })
    it('?amount=1.6678 should set transfer panel amount to 56', () => {
      cy.visit('/', {
        qs: {
          amount: '1.6678'
        }
      })
      cy.connectToApp()
      cy.findAllByPlaceholderText('Enter amount').should('have.value', '1.6678')
    })
    it('?amount=6 should set transfer panel amount to 56', () => {
      cy.visit('/', {
        qs: {
          amount: '6'
        }
      })
      cy.connectToApp()
      cy.findAllByPlaceholderText('Enter amount').should('have.value', '6')
    })
    it('?amount=0.123 should set transfer panel amount to 0.123', () => {
      cy.visit('/', {
        qs: {
          amount: '0.123'
        }
      })
      cy.connectToApp()
      cy.findAllByPlaceholderText('Enter amount').should('have.value', '0.123')
    })
    it('?amount=-0.123 should not set transfer panel amount', () => {
      cy.visit('/', {
        qs: {
          amount: '-0.123'
        }
      })
      cy.connectToApp()
      cy.findAllByPlaceholderText('Enter amount').should('not.have.value')
    })
    it('?amount=0 should set transfer panel amount to 0', () => {
      cy.visit('/', {
        qs: {
          amount: '0'
        }
      })
      cy.connectToApp()
      cy.findAllByPlaceholderText('Enter amount').should('have.value', '0')
    })
    it('?amount=asdfs should not set transfer panel amount', () => {
      cy.visit('/', {
        qs: {
          amount: 'asdfs'
        }
      })
      cy.connectToApp()
      cy.findAllByPlaceholderText('Enter amount').should('not.have.value')
    })
  })
})
