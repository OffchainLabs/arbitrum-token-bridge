/**
 * When user enters the page with query params on URL
 */

import { utils } from 'ethers'
import { scaleFrom18DecimalsToNativeTokenDecimals } from '@arbitrum/sdk'
import { formatAmount } from '../../../src/util/NumberUtils'
import {
  getInitialERC20Balance,
  getInitialETHBalance,
  getL1NetworkConfig,
  getL2NetworkConfig,
  visitAfterSomeDelay
} from '../../support/common'

describe('User enters site with query params on URL', () => {
  before(() => cy.resetAppState())

  let l1ETHbal: number
  const nativeTokenSymbol = Cypress.env('NATIVE_TOKEN_SYMBOL')
  const nativeTokenDecimals = Cypress.env('NATIVE_TOKEN_DECIMALS')
  const isCustomFeeToken = nativeTokenSymbol !== 'ETH'

  const balanceBuffer = scaleFrom18DecimalsToNativeTokenDecimals({
    amount: utils.parseEther('0.001'),
    decimals: nativeTokenDecimals
  })

  // when all of our tests need to run in a logged-in state
  // we have to make sure we preserve a healthy LocalStorage state
  // because it is cleared between each `it` cypress test
  before(() => {
    if (isCustomFeeToken) {
      getInitialERC20Balance({
        tokenAddress: Cypress.env('NATIVE_TOKEN_ADDRESS'),
        multiCallerAddress: getL1NetworkConfig().multiCall,
        address: Cypress.env('ADDRESS'),
        rpcURL: Cypress.env('ETH_RPC_URL')
      }).then(
        val =>
          (l1ETHbal = Number(
            formatAmount(val, { decimals: nativeTokenDecimals })
          ))
      )
    } else {
      getInitialETHBalance(Cypress.env('ETH_RPC_URL')).then(
        val => (l1ETHbal = Number(formatAmount(val)))
      )
    }
    cy.login({ networkType: 'parentChain' })
  })

  it('should correctly populate amount input from query param', () => {
    // only ETH is supported for now so by default the following tests are assumed to be ETH
    context(
      '?amount=max should set transfer panel amount to maximum amount possible based on balance',
      () => {
        visitAfterSomeDelay('/', {
          qs: {
            amount: 'max',
            sourceChain: getL1NetworkConfig().networkName,
            destinationChain: getL2NetworkConfig().networkName
          }
        })

        cy.findAmountInput()
          .should('be.visible')
          .should('not.have.text', 'max')
          .should('not.have.text', 'MAX')
        // it's very hard to get the max amount separately
        // so this test only asserts the amount set for the input field is less than user's balance
        // but not the exact MAX AMOUNT set by the `setMaxAmount` function in `TransferPanelMain.tsx`

        cy.findAmountInput().should($el => {
          const amount = parseFloat(String($el.val()))
          expect(amount).to.be.gt(0)
        })
        cy.findAmountInput().should($el => {
          const amount = parseFloat(String($el.val()))
          // Add a little buffer since we round down in the UI
          expect(amount).to.be.lt(Number(l1ETHbal) + Number(balanceBuffer))
        })
      }
    )
    context(
      '?amount=MAX should set transfer panel amount to maximum amount possible based on balance',
      () => {
        visitAfterSomeDelay('/', {
          qs: {
            amount: 'MAX',
            sourceChain: getL1NetworkConfig().networkName,
            destinationChain: getL2NetworkConfig().networkName
          }
        })

        cy.findAmountInput()
          .should('be.visible')
          .should('not.have.text', 'max')
          .should('not.have.text', 'MAX')
        // it's very hard to get the max amount separately
        // so this test only asserts the amount set for the input field is less than user's balance
        // but not the exact MAX AMOUNT set by the `setMaxAmount` function in `TransferPanelMain.tsx`
        cy.waitUntil(
          () => cy.findAmountInput().then($el => Number(String($el.val())) > 0),
          // optional timeouts and error messages
          {
            errorMsg: 'was expecting a numerical input value greater than 0',
            timeout: 5000,
            interval: 500
          }
        )
        cy.findAmountInput().should($el => {
          const amount = parseFloat(String($el.val()))
          expect(amount).to.be.lt(Number(l1ETHbal) + Number(balanceBuffer))
        })
      }
    )
    context(
      '?amount=MaX should set transfer panel amount to maximum amount possible based on balance',
      () => {
        visitAfterSomeDelay('/', {
          qs: {
            amount: 'MaX',
            sourceChain: getL1NetworkConfig().networkName,
            destinationChain: getL2NetworkConfig().networkName
          }
        })

        cy.findAmountInput()
          .should('be.visible')
          .should('not.have.text', 'max')
          .should('not.have.text', 'MAX')
          .should('not.have.text', 'MaX')
        // it's very hard to get the max amount separately
        // so this test only asserts the amount set for the input field is less than user's balance
        // but not the exact MAX AMOUNT set by the `setMaxAmount` function in `TransferPanelMain.tsx`
        cy.waitUntil(
          () =>
            cy.findAmountInput().should($el => {
              const amount = parseFloat(String($el.val()))
              expect(amount).to.be.gt(0)
            }),
          // optional timeouts and error messages
          {
            errorMsg: 'was expecting a numerical input value greater than 0',
            timeout: 5000,
            interval: 500
          }
        )
        cy.findAmountInput().should($el => {
          const amount = parseFloat(String($el.val()))
          expect(amount).to.be.lt(Number(l1ETHbal) + Number(balanceBuffer))
        })
      }
    )
    context('?amount=56 should set transfer panel amount to 56', () => {
      visitAfterSomeDelay('/', {
        qs: {
          amount: '56',
          sourceChain: getL1NetworkConfig().networkName,
          destinationChain: getL2NetworkConfig().networkName
        }
      })

      cy.findAmountInput().should('have.value', '56')
    })
    context('?amount=1.6678 should set transfer panel amount to 1.6678', () => {
      visitAfterSomeDelay('/', {
        qs: {
          amount: '1.6678',
          sourceChain: getL1NetworkConfig().networkName,
          destinationChain: getL2NetworkConfig().networkName
        }
      })

      cy.findAmountInput().should('have.value', '1.6678')
    })
    context('?amount=6 should set transfer panel amount to 6', () => {
      visitAfterSomeDelay('/', {
        qs: {
          amount: '6',
          sourceChain: getL1NetworkConfig().networkName,
          destinationChain: getL2NetworkConfig().networkName
        }
      })

      cy.findAmountInput().should('have.value', '6')
    })
    context('?amount=0.123 should set transfer panel amount to 0.123', () => {
      visitAfterSomeDelay('/', {
        qs: {
          amount: '0.123',
          sourceChain: getL1NetworkConfig().networkName,
          destinationChain: getL2NetworkConfig().networkName
        }
      })

      cy.url().should('include', 'amount=0.123')
      cy.findAmountInput().should('have.value', '0.123')
    })
    context('?amount=-0.123 should set transfer panel amount to 0.123', () => {
      visitAfterSomeDelay('/', {
        qs: {
          amount: '-0.123',
          sourceChain: getL1NetworkConfig().networkName,
          destinationChain: getL2NetworkConfig().networkName
        }
      })

      cy.findAmountInput().should('have.value', '0.123')
    })
    it('?amount=asdfs should not set transfer panel amount', () => {
      visitAfterSomeDelay('/', {
        qs: {
          amount: 'asdfs',
          sourceChain: getL1NetworkConfig().networkName,
          destinationChain: getL2NetworkConfig().networkName
        }
      })

      cy.findAmountInput().should('be.empty')
    })
    context('?amount=0 should set transfer panel amount to 0', () => {
      visitAfterSomeDelay('/', {
        qs: {
          amount: '0',
          sourceChain: getL1NetworkConfig().networkName,
          destinationChain: getL2NetworkConfig().networkName
        }
      })

      cy.findAmountInput().should('have.value', '0')
    })
    context('?amount=0.0001 should set transfer panel amount to 0.0001', () => {
      visitAfterSomeDelay('/', {
        qs: {
          amount: '0.0001',
          sourceChain: getL1NetworkConfig().networkName,
          destinationChain: getL2NetworkConfig().networkName
        }
      })

      cy.findAmountInput().should('have.value', '0.0001')
    })
    context('?amount=123,3,43 should not set transfer panel amount', () => {
      visitAfterSomeDelay('/', {
        qs: {
          amount: '123,3,43',
          sourceChain: getL1NetworkConfig().networkName,
          destinationChain: getL2NetworkConfig().networkName
        }
      })

      cy.findAmountInput().should('be.empty')
    })
    context(
      '?amount=0, 123.222, 0.3 should not set transfer panel amount',
      () => {
        visitAfterSomeDelay('/', {
          qs: {
            amount: '0, 123.222, 0.3',
            sourceChain: getL1NetworkConfig().networkName,
            destinationChain: getL2NetworkConfig().networkName
          }
        })

        cy.findAmountInput().should('be.empty')
      }
    )
    context('should select token using query params', () => {
      visitAfterSomeDelay('/', {
        qs: {
          sourceChain: 'sepolia',
          destinationChain: 'arbitrum-sepolia',
          // Arbitrum token on Sepolia
          token: '0xfa898e8d38b008f3bac64dce019a9480d4f06863'
        }
      })

      cy.findSelectTokenButton('ARB')
    })
  })
})

// TODO: Test amount2 when query params e2e is added back
