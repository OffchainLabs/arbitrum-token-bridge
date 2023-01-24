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

  it('should show connect wallet if not logged in', () => {
    cy.visit('/')
    cy.get('button').contains('Agree to terms').click()
    cy.findByText('MetaMask').should('be.visible')
    cy.findByText('Connect to your MetaMask Wallet').should('be.visible')
  })

  it('should connect wallet using MetaMask and show empty bridging summary successfully', () => {
    cy.login('L1')
    cy.findByText('Bridging summary will appear here.').should('be.visible')
  })

  it('should show L1 and L2 ETH balances correctly', () => {
    cy.findByText(`Balance: ${l1ETHbal}`).should('be.visible')
    cy.findByText(`Balance: ${l2ETHbal}`).should('be.visible')
  })
})
