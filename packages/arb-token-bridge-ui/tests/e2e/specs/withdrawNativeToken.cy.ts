/**
 * When user wants to bridge native token from L2 to L1
 */

import {
  getInitialETHBalance,
  getL1NetworkName,
  getL2NetworkName,
  getZeroToLessThanOneToken
} from '../../support/common'
import { formatAmount } from '../../../src/util/NumberUtils'

describe('Withdraw native token', () => {
  const nativeTokenSymbol = Cypress.env('NATIVE_TOKEN_SYMBOL')
  const zeroToLessThanOneNativeToken =
    getZeroToLessThanOneToken(nativeTokenSymbol)
  let ETHToWithdraw = Number((Math.random() * 0.001).toFixed(5)) // randomize the amount to be sure that previous transactions are not checked in e2e
  let l1EthBal: string

  beforeEach(() => {
    getInitialETHBalance(
      Cypress.env('ETH_RPC_URL'),
      Cypress.env('ADDRESS')
    ).then(
      val =>
        (l1EthBal = formatAmount(val, {
          symbol: nativeTokenSymbol
        }))
    )
  })

  // Happy Path
  context('user has some native token and is on L2', () => {
    it('should show form fields correctly', () => {
      cy.login({ networkType: 'childChain' })
      cy.findSourceChainButton(getL2NetworkName())
      cy.findDestinationChainButton(getL1NetworkName())
      cy.findMoveFundsButton().should('be.disabled')
    })

    context(
      "bridge amount is lower than user's L2 native token balance value",
      () => {
        it('should show gas estimations', () => {
          cy.login({ networkType: 'childChain' })
          cy.typeAmount(ETHToWithdraw)
          cy.findGasFeeSummary(zeroToLessThanOneNativeToken)
          cy.findGasFeeForChain(
            getL2NetworkName(),
            zeroToLessThanOneNativeToken
          )
          cy.findGasFeeForChain(
            new RegExp(
              `You'll have to pay ${getL1NetworkName()} gas fee upon claiming.`,
              'i'
            )
          )
        })

        it('should show withdrawal confirmation and withdraw', () => {
          ETHToWithdraw = Number((Math.random() * 0.001).toFixed(5)) // generate a new withdrawal amount for each test-run attempt so that findAllByText doesn't stall coz of prev transactions
          cy.login({ networkType: 'childChain' })
          cy.typeAmount(ETHToWithdraw)
          cy.clickMoveFundsButton({ shouldConfirmInMetamask: false })
          cy.findByText(/Arbitrum’s bridge/i).should('be.visible')

          // the Continue withdrawal button should be disabled at first
          cy.findByRole('button', {
            name: /Continue/i
          }).should('be.disabled')

          cy.findByRole('switch', {
            name: /before I can claim my funds/i
          })
            .should('be.visible')
            .click()

          cy.findByRole('switch', {
            name: /after claiming my funds/i
          })
            .should('be.visible')
            .click()
          // the Continue withdrawal button should not be disabled now
          cy.findByRole('button', {
            name: /Continue/i
          })
            .should('be.enabled')
            .click()

          cy.confirmMetamaskTransaction()

          cy.findTransactionInTransactionHistory({
            duration: 'a few seconds',
            amount: ETHToWithdraw,
            symbol: nativeTokenSymbol
          })

          context('transfer panel amount should be reset', () => {
            cy.switchToTransferPanelTab()
            cy.findAmountInput().should('have.value', '')
            cy.findMoveFundsButton().should('be.disabled')
          })
        })

        it('should claim funds', { defaultCommandTimeout: 200_000 }, () => {
          // increase the timeout for this test as claim button can take ~(20 blocks *10 blocks/sec) to activate
          cy.login({ networkType: 'parentChain' }) // login to L1 to claim the funds (otherwise would need to change network after clicking on claim)

          cy.switchToTransactionHistoryTab('pending')

          cy.findClaimButton(
            formatAmount(ETHToWithdraw, {
              symbol: nativeTokenSymbol
            })
          ).click()

          cy.confirmMetamaskTransaction()

          cy.findByLabelText('show settled transactions')
            .should('be.visible')
            .click()

          cy.findByText(
            `${formatAmount(ETHToWithdraw, {
              symbol: nativeTokenSymbol
            })}`
          ).should('be.visible')

          cy.switchToTransferPanelTab()

          // the balance on the destination chain should not be the same as before
          cy.findByLabelText(
            `${nativeTokenSymbol} balance amount on parentChain`
          )
            .should('be.visible')
            .its('text')
            .should('not.eq', l1EthBal)
        })
      }
    )

    it('should withdraw to custom destination address successfully', () => {
      const ETHToWithdraw = Number((Math.random() * 0.001).toFixed(5)) // randomize the amount to be sure that previous transactions are not checked in e2e

      cy.login({ networkType: 'childChain' })

      cy.typeAmount(ETHToWithdraw)
      cy.fillCustomDestinationAddress()
      cy.clickMoveFundsButton({ shouldConfirmInMetamask: false })
      cy.findByText(/Arbitrum’s bridge/i).should('be.visible')

      // the Continue withdrawal button should be disabled at first
      cy.findByRole('button', {
        name: /Continue/i
      }).should('be.disabled')

      cy.findByRole('switch', {
        name: /before I can claim my funds/i
      })
        .should('be.visible')
        .click()

      cy.findByRole('switch', {
        name: /after claiming my funds/i
      })
        .should('be.visible')
        .click()
      // the Continue withdrawal button should not be disabled now
      cy.findByRole('button', {
        name: /Continue/i
      })
        .should('be.enabled')
        .click()

      cy.confirmMetamaskTransaction()

      const txData = {
        amount: ETHToWithdraw,
        symbol: nativeTokenSymbol
      }

      cy.findTransactionInTransactionHistory({
        duration: 'a few seconds',
        ...txData
      })
      cy.openTransactionDetails(txData)
      cy.findTransactionDetailsCustomDestinationAddress(
        Cypress.env('CUSTOM_DESTINATION_ADDRESS')
      )

      // close popup
      cy.closeTransactionDetails()

      context('transfer panel amount should be reset', () => {
        cy.switchToTransferPanelTab()
        cy.findAmountInput().should('have.value', '')
        cy.findMoveFundsButton().should('be.disabled')
      })
    })

    // TODO => test for bridge amount higher than user's L2 ETH balance
  })

  // TODO - will have both cases:
  // 1. Arbitrum network is not added to metamask yet (add + switch)
  // 2. Arbitrum network already configured in metamask (only switch)
  context('user has some ETH and is on L1', () => {})
  // TODO
  context('user has some ETH and is on wrong chain', () => {})
  // TODO
  context('user has 0 ETH and is on L1', () => {})
  // TODO
  context('user has 0 ETH and is on L2', () => {})
  // TODO
  context('user has 0 ETH and is on wrong chain', () => {})
})
