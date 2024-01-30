import { formatAmount } from '../../../src/util/NumberUtils'
import { Transaction } from '../../../src/hooks/useTransactions'
import { AssetType } from '../../../src/hooks/arbTokenBridge.types'

const wethAmountToDeposit = 0.00001

function mockErc20DepositTransaction(): Transaction {
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
    it('should redeem failed retryable successfully', () => {
      cy.login({ networkType: 'L2' })

      window.localStorage.setItem(
        `arbitrum:bridge:deposits-${Cypress.env('ADDRESS').toLowerCase()}`,
        JSON.stringify([mockErc20DepositTransaction()])
      )

      context('deposit should be redeemed', () => {
        // open transaction history and wait for deposit to fetch data
        cy.openTransactionsPanel()

        // find the Retry button and the amount in the row
        cy.findByText(
          `${formatAmount(wethAmountToDeposit, {
            symbol: 'WETH'
          })}`
        )
          .should('be.visible')
          .parent()
          .parent()
          .siblings()
          .last()
          .contains(/Retry/i)
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
          })
        })
      })
    })
  })
})
