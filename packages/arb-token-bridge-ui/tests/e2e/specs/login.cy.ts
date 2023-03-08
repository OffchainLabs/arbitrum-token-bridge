/**
 * Test case suite for Login and balance check flow
 */

import { formatAmount } from '../../../src/util/NumberUtils'
import {
  getInitialETHBalance,
  l1NetworkConfig,
  ethRpcUrl,
  arbRpcUrl
} from './../../support/common'

describe('Login Account', () => {
  let l1ETHbal
  let l2ETHbal

  before(() => {
    cy.setupMetamask(Cypress.env('PRIVATE_KEY'), 'goerli')
    cy.addMetamaskNetwork(l1NetworkConfig)
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
    cy.visit('/', { qs: { l2ChainId: '412346' } })
    cy.findByText('Agree to terms').should('be.visible').click()
    cy.findByText('MetaMask').should('be.visible')
    cy.findByText('Connect to your MetaMask Wallet').should('be.visible')
  })

  it('should connect wallet using MetaMask successfully', () => {
    // cy.login({ networkType: 'L1' })
    cy.findByText('Bridging summary will appear here.').should('be.visible')
  })

  it('should show L1 and L2 ETH balances correctly', () => {
    cy.findByText(`Balance: ${l1ETHbal}`).should('be.visible')
    cy.findByText(`Balance: ${l2ETHbal}`).should('be.visible')
  })
})
