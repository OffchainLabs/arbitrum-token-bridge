/**
 * Test case suite for Login and balance check flow
 */

import { formatAmount } from '../../../src/util/NumberUtils'
import {
  getInitialETHBalance,
  getL1NetworkName,
  getL2NetworkName
} from './../../support/common'

describe('Login Account', () => {
  let l1ETHbal
  let l2ETHbal

  before(() => {
    getInitialETHBalance(Cypress.env('ETH_RPC_URL')).then(
      val => (l1ETHbal = formatAmount(val))
    )
    getInitialETHBalance(Cypress.env('ARB_RPC_URL')).then(
      val => (l2ETHbal = formatAmount(val))
    )
  })

  it('should show connect wallet if not logged in', () => {
    cy.visit('/')
    cy.findByText(/Agree to Terms and Continue/i)
      .should('be.visible')
      .click()
    cy.findByText('Connect a Wallet').should('be.visible')
    cy.findByText('MetaMask').should('be.visible')
  })

  it('should connect wallet using MetaMask and display L1 and L2 balances', () => {
    cy.login({ networkType: 'parentChain' })
    cy.findByLabelText(`ETH balance amount on parentChain`)
      .contains(l1ETHbal)
      .should('be.visible')

    cy.findByLabelText(`ETH balance amount on childChain`)
      .contains(l2ETHbal)
      .should('be.visible')

    cy.findSourceChainButton(getL1NetworkName())
    cy.findDestinationChainButton(getL2NetworkName())
  })
})
