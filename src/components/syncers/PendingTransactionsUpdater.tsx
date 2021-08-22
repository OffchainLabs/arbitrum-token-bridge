import { useCallback, useContext, useEffect } from 'react'

import { Provider, TransactionReceipt } from '@ethersproject/providers'
import { Transaction, txnTypeToLayer } from 'token-bridge-sdk'

import { useActions, useAppState } from '../../state'
import { BridgeContext } from '../App/App'

const PendingTransactionsUpdater = (): JSX.Element => {
  const bridge = useContext(BridgeContext)
  const actions = useActions()
  const {
    app: {
      pendingTransactions,
      pendingTransactionsUpdated,
      arbTokenBridge,
      arbTokenBridgeLoaded
    }
  } = useAppState()

  const getTransactionReceipt = useCallback(
    (tx: Transaction) => {
      const provider = (
        txnTypeToLayer(tx.type) === 2 ? bridge?.l2Provider : bridge?.l1Provider
      ) as Provider
      return provider?.getTransactionReceipt(tx.txID)
    },
    [bridge?.l2Provider, bridge?.l1Provider]
  )

  // eslint-disable-next-line consistent-return
  const checkAndUpdatePendingTransactions = useCallback(() => {
    if (!arbTokenBridgeLoaded) return
    if (pendingTransactions.length) {
      console.info(
        `Checking and updating ${pendingTransactions.length} pending transactions' statuses`
      )

      // eslint-disable-next-line consistent-return
      return Promise.all(
        pendingTransactions.map((tx: Transaction) => getTransactionReceipt(tx))
      ).then((txReceipts: TransactionReceipt[]) => {
        txReceipts.forEach((txReceipt: TransactionReceipt, i) => {
          if (!txReceipt) {
            console.warn(
              'Transaction receipt not found:',
              pendingTransactions[i].txID
            )
          } else {
            arbTokenBridge?.transactions?.updateTransaction(txReceipt)
          }
        })
        actions.app.setPendingTransactionsUpdated(true)
      })
    }
  }, [
    pendingTransactions,
    getTransactionReceipt,
    arbTokenBridge,
    arbTokenBridgeLoaded
  ])

  useEffect(() => {
    if (pendingTransactions?.length > 0 && !pendingTransactionsUpdated) {
      checkAndUpdatePendingTransactions()
    }
  }, [pendingTransactions])

  return <></>
}

export { PendingTransactionsUpdater }
