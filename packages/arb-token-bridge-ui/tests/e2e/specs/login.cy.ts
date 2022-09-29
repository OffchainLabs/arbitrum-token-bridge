/**
 * Test case suite for Login and balance check flow
 */

import { formatBigNumber } from '../../../src/util/NumberUtils'
import {
  getInitialETHBalance,
  goerliRPC,
  arbitrumGoerliRPC
} from './../../support/common'

describe('Login Account', () => {
  let l1ETHbal
  let l2ETHbal

  before(() => {
    getInitialETHBalance(goerliRPC).then(
      val => (l1ETHbal = formatBigNumber(val, 18, 5))
    )
    getInitialETHBalance(arbitrumGoerliRPC).then(
      val => (l2ETHbal = formatBigNumber(val, 18, 5))
    )
  })

  after(() => {
    // after all assertions are executed, logout and reset the account
    cy.logout()
  })

  it('should show connect wallet if not logged in', () => {
    cy.visit(`/`)
    cy.findByText('Agree to terms').should('be.visible').click()
    cy.findByText('MetaMask').should('be.visible')
    cy.findByText('Connect to your MetaMask Wallet').should('be.visible')
  })

  it('should connect wallet using MetaMask successfully', () => {
    cy.login()
    cy.findByText('Bridging summary will appear here.').should('be.visible')
  })

  it('should show L1 and L2 ETH balances correctly', () => {
    cy.findByText(`Balance: ${l1ETHbal} ETH`).should('be.visible')
    cy.findByText(`Balance: ${l2ETHbal} ETH`).should('be.visible')
  })

  it('should show empty bridging summary', () => {
    cy.findByText('Bridging summary will appear here.').should('be.visible')
  })
})
