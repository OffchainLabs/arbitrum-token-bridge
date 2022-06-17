import { useEffect, useMemo } from 'react'

import { PendingWithdrawalsLoadedState } from '../../util'
import { useAppState } from '../../state'
import { SeenTransactionsCache } from '../../state/SeenTransactionsCache'
import { MergedTransaction } from '../../state/app/state'
import { useAppContextDispatch, useAppContextState } from '../App/AppContext'
import { DepositCard } from '../TransferPanel/DepositCard'
import { WithdrawalCard } from '../TransferPanel/WithdrawalCard'
import { TransferPanel } from '../TransferPanel/TransferPanel'
import { Transition } from '../common/Transition'

const L2ToL1MessageStatuses = ['Unconfirmed', 'Confirmed', 'Executed']

function isDeposit(tx: MergedTransaction) {
  return tx.direction === 'deposit' || tx.direction === 'deposit-l1'
}

export function MainContent() {
  const {
    app: { mergedTransactions, pwLoadedState }
  } = useAppState()
  const { seenTransactions, layout } = useAppContextState()
  const { isTransferPanelVisible } = layout
  const dispatch = useAppContextDispatch()

  const unseenTransactions = mergedTransactions.filter(
    tx => !seenTransactions.includes(tx.txId)
  )

  const didLoadPendingWithdrawals = useMemo(
    () => pwLoadedState === PendingWithdrawalsLoadedState.READY,
    [pwLoadedState]
  )

  useEffect(() => {
    if (didLoadPendingWithdrawals) {
      const cacheCreatedTimestamp = SeenTransactionsCache.getCreationTimestamp()

      // Should never be the case, more of a sanity check
      if (!cacheCreatedTimestamp) {
        return
      }

      // Some withdrawals won't be marked as seen on cache creation, as their L2 tx hash wasn't in the local cache at initialization.
      // In that case, we wait for the L2-to-L1 messages to load via the subgraph, and then mark their L2 txs as seen.
      unseenTransactions
        .filter(tx => L2ToL1MessageStatuses.includes(tx.status))
        .forEach(tx => {
          const txCreatedAt = tx.createdAt

          // Should never be the case, more of a sanity check
          if (!txCreatedAt) {
            dispatch({ type: 'set_tx_as_seen', payload: tx.txId })
            return
          }

          // We only pick those older than the cache, so we don't accidentally mark fresh withdrawals as seen.
          if (new Date(txCreatedAt) < cacheCreatedTimestamp) {
            dispatch({ type: 'set_tx_as_seen', payload: tx.txId })
          }
        })
    }
    // It's safe to omit `dispatch` from the dependency array: https://reactjs.org/docs/hooks-reference.html#usereducer
  }, [didLoadPendingWithdrawals, unseenTransactions])

  return (
    <div className="flex w-full justify-center">
      <div className="w-full max-w-screen-lg flex-col space-y-6">
        {didLoadPendingWithdrawals &&
          unseenTransactions.map(tx =>
            isDeposit(tx) ? (
              <DepositCard key={tx.txId} tx={tx} />
            ) : (
              <WithdrawalCard key={`${tx.txId}-${tx.direction}`} tx={tx} />
            )
          )}

        <Transition show={isTransferPanelVisible} appear>
          <TransferPanel />
        </Transition>
      </div>
    </div>
  )
}
