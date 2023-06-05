import { useCallback, useEffect } from 'react'
import { TransactionReceipt } from '@ethersproject/providers'

import { Transaction, txnTypeToLayer } from '../../hooks/useTransactions'
import { useActions, useAppState } from '../../state'
import { useInterval } from '../common/Hooks'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { isTxOlderThan7Days } from '../../util/CommonUtils'

export function PendingTransactionsUpdater(): JSX.Element {
  const actions = useActions()
  const {
    l1: { provider: l1Provider },
    l2: { provider: l2Provider }
  } = useNetworksAndSigners()

  const {
    app: { arbTokenBridge, arbTokenBridgeLoaded }
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
      Promise.all(
        pendingTransactions.map((tx: Transaction) => getTransactionReceipt(tx))
      ).then((txReceipts: (TransactionReceipt | null)[]) => {
        txReceipts.forEach((txReceipt: TransactionReceipt | null, i) => {
          if (!txReceipt) {
            console.info(
              'Transaction receipt not yet found:',
              pendingTransactions[i]?.txID
            )
          } else {
            arbTokenBridge?.transactions?.updateTransaction(txReceipt)
          }
        })
      })

      // If the Txs have been pending for over 7 days,
      // they are cancelled so we should clear them from the history
      const arePendingTxsAllOlderThan7Days = pendingTransactions.every(
        pendingTx => isTxOlderThan7Days(pendingTx.timestampCreated)
      )

      if (arePendingTxsAllOlderThan7Days) {
        arbTokenBridge?.transactions?.clearPendingTransactions()
      }
    }
  }, [getTransactionReceipt, arbTokenBridge, arbTokenBridgeLoaded])
  const { forceTrigger: forceTriggerUpdate } = useInterval(
    checkAndUpdatePendingTransactions,
    4000
  )

  useEffect(() => {
    // force trigger update each time loaded change happens
    forceTriggerUpdate()
  }, [arbTokenBridgeLoaded, forceTriggerUpdate])

  return <></>
}
