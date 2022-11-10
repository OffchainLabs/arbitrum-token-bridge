import { useCallback, useEffect } from 'react'

import { TransactionReceipt } from '@ethersproject/providers'
import { isTxSuccessful, Transaction, txnTypeToLayer } from 'token-bridge-sdk'

import { useActions, useAppState } from '../../state'
import { useInterval } from '../common/Hooks'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'

export function PendingTransactionsUpdater(): JSX.Element {
  const actions = useActions()
  const {
    l1: { provider: l1Provider },
    l2: { provider: l2Provider }
  } = useNetworksAndSigners()

  const {
    app: { transactions, arbTokenBridgeLoaded }
  } = useAppState()

  const getTransactionReceipt = useCallback(
    (tx: Transaction) => {
      const provider = txnTypeToLayer(tx.type) === 2 ? l2Provider : l1Provider
      return provider.getTransactionReceipt(tx.txID)
    },
    [l1Provider, l2Provider]
  )

  // eslint-disable-next-line consistent-return
  const checkAndUpdatePendingTransactions = useCallback(() => {
    if (!arbTokenBridgeLoaded) return
    const pendingTransactions = actions.app.getPendingTransactions()
    if (pendingTransactions.length) {
      console.info(
        `Checking and updating ${pendingTransactions.length} pending transactions' statuses`
      )

      // eslint-disable-next-line consistent-return
      return Promise.all(
        pendingTransactions.map((tx: Transaction) => getTransactionReceipt(tx))
      ).then((txReceipts: (TransactionReceipt | null)[]) => {
        txReceipts.forEach((txReceipt: TransactionReceipt | null, i) => {
          if (!txReceipt) {
            console.info(
              'Transaction receipt not yet found:',
              pendingTransactions[i]?.txID
            )
          } else {
            if (isTxSuccessful(txReceipt)) {
              transactions.setTransactionSuccess(txReceipt.transactionHash)
            } else {
              transactions.setTransactionFailure(txReceipt.transactionHash)
            }
            transactions.updateTransaction(txReceipt)
          }
        })
      })
    }
  }, [getTransactionReceipt, arbTokenBridgeLoaded, transactions])
  const { forceTrigger: forceTriggerUpdate } = useInterval(
    checkAndUpdatePendingTransactions,
    4000
  )

  useEffect(() => {
    // force trigger update each time loaded change happens
    forceTriggerUpdate()
  }, [arbTokenBridgeLoaded])

  return <></>
}
