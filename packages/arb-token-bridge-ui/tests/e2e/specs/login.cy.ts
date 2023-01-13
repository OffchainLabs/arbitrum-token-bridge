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

  it('T&C visible', () => {
    cy.clearCookies()
    cy.visit('/')
    cy.clearCookies()
    cy.findByText('Agree to terms').should('be.visible')
  })

  it('Has loader on the page', () => {
    cy.visit('/')
    cy.find(`[aria-label="audio-loading"]`).should('be.visible')
  })

  it('Header item visible', () => {
    cy.visit('/')
    cy.findByText('Get Help').should('be.visible')
  })

  it('Connect Wallet button visible', () => {
    cy.visit('/')
    cy.findByText('Connect Wallet').should('be.visible')
  })

  it('Connect Wallet button in the main content visible', () => {
    cy.visit('/')
    cy.find('.rounded-lg').findByText('Connect Wallet').should('be.visible')
  })

  it('Clicks connect wallet and displays MetaMask popup', () => {
    cy.visit('/')
    cy.findByText('Connect Wallet').click()
    cy.isMetamaskWindowActive().should('be.true')
  })

  it('MetaMask image is defined', () => {
    cy.visit('/')
    cy.findByAltText('MetaMask').should('not.be.undefined')
  })

  it('WalletConnect image is defined', () => {
    cy.visit('/')
    cy.findByAltText('WalletConnect').should('not.be.undefined')
  })

  it('MetaMask image is visible', () => {
    cy.visit('/')
    cy.findByAltText('MetaMask').should('be.visible')
  })

  it('WalletConnect image is visible', () => {
    cy.visit('/')
    cy.findByAltText('WalletConnect').should('be.visible')
  })

  it('MetaMask window shown', () => {
    cy.visit('/')
    cy.isMetamaskWindowActive().should('be.true')
  })

  it('Footer moon defined', () => {
    cy.visit('/')
    cy.findByAltText('Moon').should('not.be.undefined')
  })

  it('Footer moon visible', () => {
    cy.visit('/')
    cy.findByAltText('Moon').should('be.visible')
  })

  it('should show connect wallet if not logged in', () => {
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
