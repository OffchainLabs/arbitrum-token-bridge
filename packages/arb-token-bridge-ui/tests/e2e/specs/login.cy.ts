/**
 * Test case suite for Login and balance check flow
 */

import { formatAmount } from '../../../src/util/NumberUtils'
import {
  getInitialETHBalance,
  ethRpcUrl,
  arbRpcUrl
} from './../../support/common'

cy.on('window:before:load', win => {
  cy.spy(win.console, 'error')
})

cy.on('uncaught:exception', err => {
  console.log('err', err)
  cy.log('err', err)
  throw err
})

describe('Login Account', () => {
  let l1ETHbal
  let l2ETHbal

  before(() => {
    getInitialETHBalance(ethRpcUrl).then(
      val => (l1ETHbal = formatAmount(val, { symbol: 'ETH' }))
    )
    getInitialETHBalance(arbRpcUrl).then(
      val => (l2ETHbal = formatAmount(val, { symbol: 'ETH' }))
    )
  })

  after(() => {
    // after all assertions are executed, logout and reset the account
    cy.logout()
  })

  // it('just visits home page', () => {
  //   cy.visit('/')
  // })

  it('should pass this test', () => {
    // console.log('testing logs')
    // cy.on('uncaught:exception', err => {
    //   console.log('err', err)
    //   cy.log('err', err)
    //   throw new Error(`error from should pass test: ${err}`)
    // })
    cy.visit('/')

    // cy.waitUntil(() =>
    //   cy.visit('/', {
    //     onBeforeLoad(win) {
    //       cy.stub(win.console, 'log').as('consoleLog')
    //       cy.stub(win.console, 'error').as('consoleError')
    //     }
    //   })
    // )
    cy.find('.web3modal-provider-container')
      .should('not.be.undefined')
      .and('not.be.visible')
    // cy.findByText('WalletConnect').should('be.visible')
    // cy.on('fail', error => {
    //   debugger

    //   console.log('ERROR FROM WALLET CONNECT BUTTON')

    //   throw error
    // })
  })

  it('should show connect wallet if not logged in', () => {
    cy.on('fail', error => {
      debugger

      throw error
    })
    cy.visit('/')
    cy.findByText('Agree to terms').should('be.visible').click()
    cy.findByText('MetaMask').should('be.visible')
    cy.findByText('Connect to your MetaMask Wallet').should('be.visible')
  })

  it('should connect wallet using MetaMask successfully', () => {
    cy.login('L1')
    cy.findByText('Bridging summary will appear here.').should('be.visible')
  })

  it('should show L1 and L2 ETH balances correctly', () => {
    cy.findByText(`Balance: ${l1ETHbal}`).should('be.visible')
    cy.findByText(`Balance: ${l2ETHbal}`).should('be.visible')
  })

  it('should show empty bridging summary', () => {
    cy.findByText('Bridging summary will appear here.').should('be.visible')
  })
})
