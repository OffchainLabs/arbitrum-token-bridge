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
    ...params,
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
    }
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

  // Happy Path
  context('User has a classic ETH deposit transaction', () => {
    // log in to metamask
    before(() => {
      cy.login({ networkType: 'L1' })
    })

    after(() => {
      // after all assertions are executed, logout and reset the account
      cy.logout()
    })

    it('can read message successfully', () => {
      cy.setLocalStorage(
        'arbTransactions',
        JSON.stringify([
          mockClassicDepositTransaction({
            txID: '0x410301bba1987cd02c8c68c60fe7e56a3c5842857062b157c08edf9f3ac7526a',
            value: '0.05'
          })
        ])
      )

      cy.changeMetamaskNetwork('mainnet').then(() => {
        cy.closeLowBalanceDialog()
        cy.openAccountPopover()

        const l1TxHash =
          '0x410301bba1987cd02c8c68c60fe7e56a3c5842857062b157c08edf9f3ac7526a'
        const l2TxHash =
          '0xa8af89040713368f6ef848e1ac45e7162210211f5e3399b3d274684703181873'

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
