/**
 * Test case suite for Login and balance check flow
 */

import { formatAmount } from '../../../src/util/NumberUtils'
import {
  getInitialERC20Balance,
  getInitialETHBalance,
  getL1NetworkConfig,
  getL1NetworkName,
  getL2NetworkName,
  getNativeTokenAddress
} from './../../support/common'

describe('Login Account', () => {
  let l1ETHbal
  let l2ETHbal
  // DO NOT RENAME: l2NativeTokenBal is actual L2 native token balance. Remove this comment in L1/L2 renaming PR.
  let l2NativeTokenBal

  const nativeTokenSymbol = Cypress.env('NATIVE_TOKEN_SYMBOL')
  const isCustomFeeToken = nativeTokenSymbol !== 'ETH'

  before(() => {
    getInitialETHBalance(Cypress.env('ETH_RPC_URL')).then(
      val => (l1ETHbal = formatAmount(val, { symbol: 'ETH' }))
    )
    getInitialETHBalance(Cypress.env('ARB_RPC_URL')).then(
      val => (l2ETHbal = formatAmount(val))
    )
    if (isCustomFeeToken) {
      getInitialERC20Balance({
        tokenAddress: getNativeTokenAddress(),
        multiCallerAddress: getL1NetworkConfig().multiCall,
        rpcURL: Cypress.env('ETH_RPC_URL'),
        address: Cypress.env('ADDRESS')
      }).then(val => (l2NativeTokenBal = formatAmount(val)))
    }
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
    if (isCustomFeeToken) {
      cy.findByLabelText(
        new RegExp(`${nativeTokenSymbol} balance amount on parentChain`, 'i')
      )
        .contains(l2NativeTokenBal)
        .should('be.visible')

      cy.findByText(l1ETHbal).should('be.visible')
    } else {
      // Balance: is in a different element so we check for siblings
      cy.findByText(l1ETHbal)
        .should('be.visible')
        .siblings()
        .contains('Balance: ')
    }
    if (isCustomFeeToken) {
      cy.findByLabelText(
        new RegExp(`${nativeTokenSymbol} balance amount on childChain`, 'i')
      )
        .contains(l2ETHbal)
        .should('be.visible')
    } else {
      // Balance: is in a different element so we check for siblings
      cy.findByText(l2ETHbal)
        .should('be.visible')
        .siblings()
        .contains('Balance: ')
      cy.findSourceChainButton(getL1NetworkName())
      cy.findDestinationChainButton(getL2NetworkName())
    }
  })
})
