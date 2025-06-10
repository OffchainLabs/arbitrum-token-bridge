/**
 * Test case suite for Login and balance check flow
 */

import { formatAmount } from '../../../src/util/NumberUtils'
import {
  getInitialERC20Balance,
  getInitialETHBalance,
  getL1NetworkConfig,
  getL1NetworkName,
  getL2NetworkName
} from './../../support/common'

describe('Login Account', () => {
  let l1ETHbal
  let l2ETHbal

  const nativeTokenSymbol = Cypress.env('NATIVE_TOKEN_SYMBOL')
  const nativeTokenDecimals = Cypress.env('NATIVE_TOKEN_DECIMALS')
  const isCustomFeeToken = nativeTokenSymbol !== 'ETH'

  before(() => {
    if (isCustomFeeToken) {
      getInitialERC20Balance({
        tokenAddress: Cypress.env('NATIVE_TOKEN_ADDRESS'),
        multiCallerAddress: getL1NetworkConfig().multiCall,
        address: Cypress.env('ADDRESS'),
        rpcURL: Cypress.env('ETH_RPC_URL')
      }).then(
        val => (l1ETHbal = formatAmount(val, { decimals: nativeTokenDecimals }))
      )
    } else {
      getInitialETHBalance(Cypress.env('ETH_RPC_URL')).then(
        val => (l1ETHbal = formatAmount(val))
      )
    }
    getInitialETHBalance(Cypress.env('ARB_RPC_URL')).then(
      val => (l2ETHbal = formatAmount(val))
    )
  })

  it('should show connect wallet if not logged in', () => {
    cy.visit('/')
    cy.findByText(/I have read and agree to the/i) // click on terms and conditions checkbox
      .should('be.visible')
      .click()
    cy.findAllByText('Connect Wallet').first().should('be.visible').click()
    cy.findByText('MetaMask').should('be.visible')
  })

  it('should connect wallet using MetaMask and display L1 and L2 balances', () => {
    cy.login({ networkType: 'parentChain' })
    cy.findByLabelText(`${nativeTokenSymbol} balance amount on parentChain`)
      .should('be.visible')
      .contains(l1ETHbal)
    cy.findByLabelText(`${nativeTokenSymbol} balance amount on childChain`)
      .should('be.visible')
      .contains(l2ETHbal)

    cy.findSourceChainButton(getL1NetworkName())
    cy.findDestinationChainButton(getL2NetworkName())
  })
})
