import { useCallback, useEffect } from 'react'
import { TransactionReceipt } from '@ethersproject/providers'
import { useAccount } from 'wagmi'

import { Transaction, txnTypeToLayer } from '../../hooks/useTransactions'
import { useActions, useAppState } from '../../state'
import { useInterval } from '../common/Hooks'
import { useCctpState, useUpdateCctpTransactions } from '../../state/cctpState'
import { useNetworks } from '../../hooks/useNetworks'
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship'

export function PendingTransactionsUpdater(): JSX.Element {
  const actions = useActions()
  const [networks] = useNetworks()
  const { childChain, childChainProvider, parentChain, parentChainProvider } =
    useNetworksRelationship(networks)
  const { updateCctpTransactions } = useUpdateCctpTransactions()

  const {
    app: { arbTokenBridge, arbTokenBridgeLoaded }
  } = useAppState()
  const { address } = useAccount()
  const { resetTransfers } = useCctpState()

  useEffect(() => {
    resetTransfers()
  }, [address, childChain.id, parentChain.id, resetTransfers])

  const getTransactionReceipt = useCallback(
    (tx: Transaction) => {
      const provider =
        txnTypeToLayer(tx.type) === 2 ? childChainProvider : parentChainProvider
      return provider.getTransactionReceipt(tx.txID)
    },
    [childChainProvider, parentChainProvider]
  )

  const checkAndUpdatePendingTransactions = useCallback(() => {
    if (!arbTokenBridgeLoaded) return
    updateCctpTransactions()
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
