import { L1ToL2MessageStatus } from '@arbitrum/sdk'

import { shortenTxHash } from '../../../src/util/CommonUtils'
import { Transaction } from '../../../src/hooks/useTransactions'
import { AssetType } from '../../../src/hooks/arbTokenBridge.types'

type MockClassicDepositTransactionParams = {
  txID: string
  value: string
} & Partial<Transaction>

function mockClassicDepositTransaction(
  params: MockClassicDepositTransactionParams
): Transaction {
  const dateNow = new Date()
  const dateYearAgo = new Date(dateNow.setFullYear(dateNow.getFullYear() - 1))

  return {
    type: 'deposit-l1',
    direction: 'deposit',
    source: 'event_logs',
    parentChainId: 1,
    childChainId: 42161,
    status: 'success',
    isClassic: true,
    assetName: 'ETH',
    assetType: AssetType.ETH,
    sender: Cypress.env('ADDRESS'),
    l1NetworkID: '1',
    l2NetworkID: '42161',
    timestampCreated: dateYearAgo.toISOString(),
    timestampResolved: dateYearAgo.toISOString(),
    l1ToL2MsgData: {
      fetchingUpdate: false,
      status: L1ToL2MessageStatus.NOT_YET_CREATED,
      retryableCreationTxID: undefined,
      l2TxID: undefined
    },
    ...params
  }
}

describe('Read classic deposit messages', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  context('User has classic ETH deposit transaction', () => {
    it('can read successful ETH deposit', () => {
      // log in to metamask
      cy.login({
        networkType: 'L1',
        networkName: 'mainnet'
      })
      window.localStorage.setItem(
        `arbitrum:bridge:deposits-${Cypress.env('ADDRESS').toLowerCase()}`,
        JSON.stringify([
          mockClassicDepositTransaction({
            txID: '0x00000a813d47f2c478dcc3298d5361cb3aed817648f25cace6d0c1a59d2b8309',
            value: '0.024'
          })
        ])
      )

      cy.openTransactionsPanel()

      context('settled tab should be selected after click', () => {
        cy.findByRole('tab', { name: 'show settled transactions' })
          .should('be.visible')
          .click()
          .should('have.attr', 'data-headlessui-state')
          .and('equal', 'selected')
      })

      const destinationTxHash =
        '0xd3ff2a70a115411e1ae4917351dca49281368684394d0dcac136fa08d9d9b436'

      cy.findByLabelText(/Transaction status/i)
        .should('contain', 'Success')
        .and('have.attr', 'href')
        .and('include', destinationTxHash)
    })
  })

  context('User has classic ERC-20 deposit transaction', () => {
    it('can read successful ERC-20 deposit', () => {
      // log in to metamask
      cy.login({
        networkType: 'L1',
        networkName: 'mainnet'
      })
      window.localStorage.setItem(
        `arbitrum:bridge:deposits-${Cypress.env('ADDRESS').toLowerCase()}`,
        JSON.stringify([
          mockClassicDepositTransaction({
            txID: '0x000153c231eb9fd3690b5e818fb671bdd09d678fe46b16b8f694f3beb9cf6db1',
            value: '10,000',
            assetType: AssetType.ERC20,
            assetName: 'DAI'
          })
        ])
      )

      cy.openTransactionsPanel()

      context('settled tab should be selected after click', () => {
        cy.findByRole('tab', { name: 'show settled transactions' })
          .should('be.visible')
          .click()
          .should('have.attr', 'data-headlessui-state')
          .and('equal', 'selected')
      })

      const destinationTxHash =
        '0x6cecd3bfc3ec73181c4ac0253d3f51e5aa8d26157ca7439ff9ab465de14a436f'

      cy.findByLabelText(/Transaction status/i)
        .should('contain', 'Success')
        .and('have.attr', 'href')
        .and('include', destinationTxHash)
    })
  })
})
