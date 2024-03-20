import { formatAmount } from '../../../src/util/NumberUtils'
import { Transaction } from '../../../src/hooks/useTransactions'
import { AssetType } from '../../../src/hooks/arbTokenBridge.types'
import {
  getInitialERC20Balance,
  getL2NetworkConfig,
  wethTokenAddressL2
} from '../../support/common'

const wethAmountToDeposit = 0.001

function mockErc20RedeemDepositTransaction(): Transaction {
  return {
    txID: Cypress.env('REDEEM_RETRYABLE_TEST_TX'),
    value: wethAmountToDeposit.toString(),
    type: 'deposit-l1',
    direction: 'deposit',
    source: 'local_storage_cache',
    parentChainId: 1337,
    childChainId: 412346,
    status: 'pending',
    assetName: 'WETH',
    assetType: AssetType.ERC20,
    sender: Cypress.env('ADDRESS'),
    destination: Cypress.env('ADDRESS'),
    l1NetworkID: '1337',
    l2NetworkID: '412346',
    timestampCreated: Math.floor(Date.now() / 1000).toString()
  }
}

describe('Redeem ERC20 Deposit', () => {
  context('User has some ERC20 and is on L1', () => {
    let l2ERC20bal: string
    beforeEach(() => {
      getInitialERC20Balance({
        tokenAddress: wethTokenAddressL2,
        multiCallerAddress: getL2NetworkConfig().multiCall,
        address: Cypress.env('ADDRESS'),
        rpcURL: Cypress.env('ARB_RPC_URL')
      }).then(val => (l2ERC20bal = formatAmount(val)))
    })

    it('should redeem failed retryable successfully', () => {
      cy.login({ networkType: 'L2' })

      window.localStorage.setItem(
        `arbitrum:bridge:deposits-${Cypress.env('ADDRESS').toLowerCase()}`,
        JSON.stringify([mockErc20RedeemDepositTransaction()])
      )

      context('should add a new token', () => {
        cy.searchAndSelectToken({
          tokenName: 'WETH',
          tokenAddress: wethTokenAddressL2
        })

        // check the balance on the destination chain before redeeming
        context('should show ERC-20 balance correctly', () => {
          cy.findByLabelText('WETH balance amount on l2')
            .should('be.visible')
            .contains(l2ERC20bal)
            .should('be.visible')
        })
      })

      context('deposit should be redeemed', () => {
        // open transaction history and wait for deposit to fetch data
        cy.openTransactionsPanel()

        // find the Retry button and the amount in the row
        cy.findByText(
          `${formatAmount(wethAmountToDeposit, {
            symbol: 'WETH'
          })}`
        ).should('be.visible')

        cy.findAllByLabelText(/Retry transaction/i)
          .first()
          .should('be.visible')
          .should('not.be.disabled')
          .click()

        // approve redeem transaction
        cy.confirmMetamaskTransaction().then(() => {
          cy.wait(15_000).then(() => {
            // switch to settled transactions
            cy.findByLabelText('show settled transactions')
              .should('be.visible')
              .click()

            // find the same transaction there redeemed successfully
            cy.findByText(
              `${formatAmount(wethAmountToDeposit, {
                symbol: 'WETH'
              })}`
            )

            // close transaction history
            cy.findByLabelText('Close side panel').click()

            // wait for the destination balance to update
            cy.wait(5_000).then(() => {
              // the balance on the destination chain should not be the same as before
              cy.findByLabelText('WETH balance amount on l2')
                .should('be.visible')
                .invoke('text')
                .should(
                  'eq',
                  formatAmount(Number(l2ERC20bal) + wethAmountToDeposit)
                )
            })
          })
        })
      })
    })
  })
})
