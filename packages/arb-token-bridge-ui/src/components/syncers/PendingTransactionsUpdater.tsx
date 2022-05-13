import { useCallback, useEffect } from 'react'

import { TransactionReceipt } from '@ethersproject/providers'
import { Transaction, txnTypeToLayer } from 'token-bridge-sdk'

import { useActions, useAppState } from '../../state'
import { useInterval } from '../common/Hooks'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'

import { L1TransactionReceipt } from '@arbitrum/sdk'

interface TransactionReceiptWithSeqNum extends TransactionReceipt {
  seqNum?: number // for l1-initiati
}

export function PendingTransactionsUpdater(): JSX.Element {
  const actions = useActions()
  const {
    l1: { signer: l1Signer },
    l2: { signer: l2Signer }
  } = useNetworksAndSigners()

  const {
    app: { arbTokenBridge, arbTokenBridgeLoaded }
  } = useAppState()

  const getTransactionReceipt = useCallback(
    (tx: Transaction) => {
      const provider =
        txnTypeToLayer(tx.type) === 2 ? l2Signer?.provider : l1Signer?.provider

      if (typeof provider === 'undefined') {
        return null
      }

      if (tx.type == 'deposit-l1') {
        // We need to get the seqNum for deposit tx if its missing
        return provider
          .getTransactionReceipt(tx.txID)
          .then(async (txr: TransactionReceipt) => {
            const l1ToL2Msg = await new L1TransactionReceipt(txr).getL1ToL2Message(provider)
            return { ...txr, seqNum: l1ToL2Msg.messageNumber.toNumber()}
          })
      } else {
        return provider.getTransactionReceipt(tx.txID)
      }
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
      ).then((txReceipts: (TransactionReceiptWithSeqNum | null)[]) => {
        txReceipts.forEach(
          (txReceipt: TransactionReceiptWithSeqNum | null, i) => {
            if (!txReceipt) {
              console.info(
                'Transaction receipt not yet found:',
                pendingTransactions[i].txID
              )
            } else {
              arbTokenBridge?.transactions?.updateTransaction(
                txReceipt,
                undefined,
                txReceipt.seqNum
              )
            }
          }
        )
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
