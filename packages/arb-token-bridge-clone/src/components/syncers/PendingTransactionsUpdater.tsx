import { useCallback, useContext, useEffect } from 'react'

import { Provider, TransactionReceipt } from '@ethersproject/providers'
import { Transaction, txnTypeToLayer } from 'token-bridge-sdk'

import { useActions, useAppState } from '../../state'
import { BridgeContext } from '../App/App'
import { useInterval } from '../common/Hooks'

const PendingTransactionsUpdater = (): JSX.Element => {
  const bridge = useContext(BridgeContext)
  const actions = useActions()
  const {
    app: { arbTokenBridge, arbTokenBridgeLoaded }
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
    const pendingTransactions = actions.app.getPendingTransactions()
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

export { PendingTransactionsUpdater }
