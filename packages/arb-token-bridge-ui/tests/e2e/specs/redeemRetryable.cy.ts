import { formatAmount } from '../../../src/util/NumberUtils'
import { AssetType } from '../../../src/hooks/arbTokenBridge.types'
import {
  getInitialERC20Balance,
  getL2NetworkConfig
} from '../../support/common'

const wethAmountToDeposit = 0.001

function mockErc20RedeemDepositTransaction() {
  const isOrbitTest = Cypress.env('ORBIT_TEST') == '1'

  return {
    txID: Cypress.env('REDEEM_RETRYABLE_TEST_TX'),
    value: wethAmountToDeposit.toString(),
    type: 'deposit-l1',
    direction: 'deposit',
    source: 'local_storage_cache',
    parentChainId: isOrbitTest ? 412346 : 1337,
    childChainId: isOrbitTest ? 333333 : 412346,
    status: 'pending',
    assetName: 'WETH',
    assetType: AssetType.ERC20,
    sender: Cypress.env('ADDRESS'),
    destination: Cypress.env('ADDRESS'),
    l1NetworkID: isOrbitTest ? '412346' : '1337',
    l2NetworkID: isOrbitTest ? '333333' : '412346',
    timestampCreated: Math.floor(Date.now() / 1000).toString()
  }
}

describe('Redeem ERC20 Deposit', () => {
  const l2WethAddress = Cypress.env('L2_WETH_ADDRESS')

  context('User has some ERC20 and is on L1', () => {
    let l2ERC20bal: string
    beforeEach(() => {
      getInitialERC20Balance({
        tokenAddress: l2WethAddress,
        multiCallerAddress: getL2NetworkConfig().multiCall,
        address: Cypress.env('ADDRESS'),
        rpcURL: Cypress.env('ARB_RPC_URL')
      }).then(val => (l2ERC20bal = formatAmount(val)))
    })

    it('should redeem failed retryable successfully', () => {
      cy.login({ networkType: 'childChain' })

      window.localStorage.setItem(
        `arbitrum:bridge:deposits-${Cypress.env('ADDRESS').toLowerCase()}`,
        JSON.stringify([mockErc20RedeemDepositTransaction()])
      )

      context('should add a new token', () => {
        cy.searchAndSelectToken({
          tokenName: 'WETH',
          tokenAddress: l2WethAddress
        })

        // check the balance on the destination chain before redeeming
        context('should show ERC-20 balance correctly', () => {
          cy.findByLabelText('WETH balance amount on childChain')
            .should('be.visible')
            .contains(l2ERC20bal)
            .should('be.visible')
        })
      })

      context('deposit should be redeemed', () => {
        // open transaction history and wait for deposit to fetch data
        cy.switchToTransactionHistoryTab('pending')

        // give ci more time to fetch the transactions
        cy.wait(15_000)

        // find the Retry button and the amount in the row
        cy.findTransactionInTransactionHistory({
          amount: wethAmountToDeposit,
          symbol: 'WETH'
        })

        cy.findAllByLabelText(/Retry transaction/i)
          .first()
          .should('be.visible')
          .should('not.be.disabled')
          .click()

        // approve redeem transaction
        cy.confirmMetamaskTransaction()
        cy.wait(15_000)
        cy.selectTransactionsPanelTab('settled')

        // find the same transaction there redeemed successfully
        cy.findTransactionInTransactionHistory({
          amount: wethAmountToDeposit,
          symbol: 'WETH'
        })

        cy.switchToTransferPanelTab()

        // wait for the destination balance to update
        cy.wait(5_000)
        // the balance on the destination chain should not be the same as before
        cy.findByLabelText('WETH balance amount on childChain')
          .should('be.visible')
          .invoke('text')
          .should('eq', formatAmount(Number(l2ERC20bal) + wethAmountToDeposit))
      })
    })
  })
})
