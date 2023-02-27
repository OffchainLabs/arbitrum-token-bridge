import { Transaction, AssetType } from 'token-bridge-sdk'
import { L1ToL2MessageStatus } from '@arbitrum/sdk'

import { resetSeenTimeStampCache } from '../../support/common'
import { shortenTxHash } from '../../../src/util/CommonUtils'

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
    status: 'success',
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
  // when all of our tests need to run in a logged-in state
  // we have to make sure we preserve a healthy LocalStorage state
  // because it is cleared between each `it` cypress test
  before(() => {
    // before this spec, make sure the cache is fresh
    // otherwise pending transactions from last ran specs will leak in this
    resetSeenTimeStampCache()
  })

  beforeEach(() => {
    cy.restoreAppState()
  })

  afterEach(() => {
    cy.saveAppState()
  })

  context('User has classic ETH deposit transaction', () => {
    // log in to metamask
    before(() => {
      cy.login({ networkType: 'L1' })
    })

    after(() => {
      // after all assertions are executed, logout and reset the account
      cy.logout()
    })

    it('can read successful ETH deposit', () => {
      cy.setLocalStorage(
        'arbTransactions',
        JSON.stringify([
          mockClassicDepositTransaction({
            txID: '0x00000a813d47f2c478dcc3298d5361cb3aed817648f25cace6d0c1a59d2b8309',
            value: '0.024'
          })
        ])
      )

      cy.changeMetamaskNetwork('mainnet').then(() => {
        cy.closeLowBalanceDialog()
        cy.openAccountPopover()

        const l1TxHash =
          '0x00000a813d47f2c478dcc3298d5361cb3aed817648f25cace6d0c1a59d2b8309'
        const l2TxHash =
          '0xd3ff2a70a115411e1ae4917351dca49281368684394d0dcac136fa08d9d9b436'

        cy.findByLabelText(/l1 transaction status/i).should(
          'contain',
          'Success'
        )
        cy.findByLabelText(/l2 transaction status/i).should(
          'contain',
          'Success'
        )

        cy.findByLabelText(/l1 transaction link/i).should(
          'contain',
          `L1: ${shortenTxHash(l1TxHash)}`
        )

        cy.findByLabelText(/l2 transaction link/i).should(
          'contain',
          `L2: ${shortenTxHash(l2TxHash)}`
        )
      })
    })
  })

  context('User has classic ERC-20 deposit transaction', () => {
    // log in to metamask
    before(() => {
      cy.login({ networkType: 'L1' })
    })

    after(() => {
      // after all assertions are executed, logout and reset the account
      cy.logout()
    })

    it('can read successful ERC-20 deposit', () => {
      cy.setLocalStorage(
        'arbTransactions',
        JSON.stringify([
          mockClassicDepositTransaction({
            txID: '0x000153c231eb9fd3690b5e818fb671bdd09d678fe46b16b8f694f3beb9cf6db1',
            value: '10,000',
            assetType: AssetType.ERC20,
            assetName: 'DAI'
          })
        ])
      )

      cy.changeMetamaskNetwork('mainnet').then(() => {
        cy.closeLowBalanceDialog()
        cy.openAccountPopover()

        const l1TxHash =
          '0x000153c231eb9fd3690b5e818fb671bdd09d678fe46b16b8f694f3beb9cf6db1'
        const l2TxHash =
          '0x6cecd3bfc3ec73181c4ac0253d3f51e5aa8d26157ca7439ff9ab465de14a436f'

        cy.findByLabelText(/l1 transaction status/i).should(
          'contain',
          'Success'
        )
        cy.findByLabelText(/l2 transaction status/i).should(
          'contain',
          'Success'
        )

        cy.findByLabelText(/l1 transaction link/i).should(
          'contain',
          `L1: ${shortenTxHash(l1TxHash)}`
        )

        cy.findByLabelText(/l2 transaction link/i).should(
          'contain',
          `L2: ${shortenTxHash(l2TxHash)}`
        )
      })
    })
  })
})
