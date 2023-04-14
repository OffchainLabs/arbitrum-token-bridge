/**
 * Test case suite for Login and balance check flow
 */

import { formatAmount } from '../../../src/util/NumberUtils'
import {
  getInitialETHBalance,
  metamaskLocalL1RpcUrl
} from './../../support/common'

describe('Login Account', () => {
  let l1ETHbal
  let l2ETHbal

  before(() => {
    getInitialETHBalance(Cypress.env('ETH_RPC_URL')).then(
      val => (l1ETHbal = formatAmount(val, { symbol: 'ETH' }))
    )
    getInitialETHBalance(Cypress.env('ARB_RPC_URL')).then(
      val => (l2ETHbal = formatAmount(val, { symbol: 'ETH' }))
    )
  })

  it('should show connect wallet if not logged in', () => {
    cy.visit('/')
    cy.findByText('Agree to terms').should('be.visible').click()
    cy.findByText('MetaMask').should('be.visible')
    cy.findByText('Connect to your MetaMask Wallet').should('be.visible')
  })

  it('should connect wallet using MetaMask and display L1 and L2 balances', () => {
    cy.login({
      networkType: 'L1',
      // we add a new network if RPC is different to already set up MetaMask local network
      // this is the case for CI where we use a different RPC url
      addNewNetwork: Cypress.env('ETH_RPC_URL') !== metamaskLocalL1RpcUrl,
      shouldChangeNetwork: true,
      // first connection, need to confirm metamask popup
      isWalletConnected: false
    })
    cy.findByText('Bridging summary will appear here.').should('be.visible')
    cy.findByText(`Balance: ${l1ETHbal}`).should('be.visible')
    cy.findByText(`Balance: ${l2ETHbal}`).should('be.visible')
    cy.findByRole('button', { name: /From: Ethereum/i }).should('be.visible')
    cy.findByRole('button', { name: /To: Arbitrum/i }).should('be.visible')
  })
})
