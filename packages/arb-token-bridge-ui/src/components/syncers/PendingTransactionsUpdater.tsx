import { useCallback, useEffect } from 'react'

import { TransactionReceipt } from '@ethersproject/providers'
import { Transaction, txnTypeToLayer } from 'token-bridge-sdk'

import { useActions, useAppState } from '../../state'
import { useInterval } from '../common/Hooks'
import { useSigners } from '../../hooks/useSigners'

export function PendingTransactionsUpdater(): JSX.Element {
  const actions = useActions()
  const { l1Signer, l2Signer } = useSigners()

  const {
    app: { arbTokenBridge, arbTokenBridgeLoaded }
  } = useAppState()

  const getTransactionReceipt = useCallback(
    (tx: Transaction) => {
      const provider =
        txnTypeToLayer(tx.type) === 2 ? l2Signer?.provider : l1Signer?.provider
      return provider?.getTransactionReceipt(tx.txID)
    },
    [l1Signer, l2Signer]
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
      ).then((txReceipts: (TransactionReceipt | undefined)[]) => {
        txReceipts.forEach((txReceipt: TransactionReceipt | undefined, i) => {
          if (typeof txReceipt === 'undefined') {
            console.info(
              'Transaction receipt not yet found:',
              pendingTransactions[i].txID
            )
          } else {
            arbTokenBridge?.transactions?.updateTransaction(txReceipt)
          }
        })
      })
    }
  }, [getTransactionReceipt, arbTokenBridge, arbTokenBridgeLoaded])
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
