import { useEffect, useMemo } from 'react'
import { usePrevious } from 'react-use'
import { motion, AnimatePresence } from 'framer-motion'

import { PendingWithdrawalsLoadedState } from '../../util'
import { useAppState } from '../../state'
import { SeenTransactionsCache } from '../../state/SeenTransactionsCache'
import { MergedTransaction } from '../../state/app/state'
import { useAppContextDispatch, useAppContextState } from '../App/AppContext'
import { DepositCard } from '../TransferPanel/DepositCard'
import { WithdrawalCard } from '../TransferPanel/WithdrawalCard'
import { TransferPanel } from '../TransferPanel/TransferPanel'
import { ExploreArbitrum } from './ExploreArbitrum'

const motionDivProps = {
  layout: true,
  initial: {
    opacity: 0,
    scale: 0.9
  },
  animate: {
    opacity: 1,
    scale: 1
  },
  exit: {
    opacity: 0,
    scale: 0.9
  }
}

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

  const unseenTransactions = mergedTransactions
    .filter(tx => !seenTransactions.includes(tx.txId))
    // These will be included in the withdrawal cards which are based on L2-to-L1 messages
    .filter(tx => tx.direction !== 'withdraw')
    // TODO: Include token approval transactions?
    .filter(tx => tx.direction !== 'approve')
    .filter(tx => {
      if (
        tx.direction === 'outbox' &&
        !L2ToL1MessageStatuses.includes(tx.status)
      ) {
        return false
      }

      return true
    })

  const prevUnseenTransactions = usePrevious(unseenTransactions)

  const didLoadPendingWithdrawals = useMemo(
    () => pwLoadedState === PendingWithdrawalsLoadedState.READY,
    [pwLoadedState]
  )

  useEffect(() => {
    const prevUnseenTransactionsLength = prevUnseenTransactions?.length || 0

    // The last visible card was hidden, so bring back the transfer panel
    if (prevUnseenTransactionsLength > 0 && unseenTransactions.length === 0) {
      dispatch({ type: 'layout.set_is_transfer_panel_visible', payload: true })
    }
    // It's safe to omit `dispatch` from the dependency array: https://reactjs.org/docs/hooks-reference.html#usereducer
  }, [unseenTransactions, prevUnseenTransactions])

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
        <AnimatePresence>
          {didLoadPendingWithdrawals && (
            <>
              {unseenTransactions.map(tx => (
                <motion.div
                  key={`${tx.txId}-${tx.direction}`}
                  {...motionDivProps}
                >
                  {isDeposit(tx) ? (
                    <DepositCard key={`${tx.txId}-${tx.direction}`} tx={tx} />
                  ) : (
                    <WithdrawalCard
                      key={`${tx.txId}-${tx.direction}`}
                      tx={tx}
                    />
                  )}
                </motion.div>
              ))}
            </>
          )}
        </AnimatePresence>

        <AnimatePresence exitBeforeEnter>
          {isTransferPanelVisible && (
            <motion.div key="transfer-panel" {...motionDivProps}>
              <TransferPanel />
            </motion.div>
          )}

          {unseenTransactions.length > 0 && (
            <motion.div key="explore-arbitrum" {...motionDivProps}>
              <ExploreArbitrum />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Some additional spacing before footer */}
        {unseenTransactions.length > 0 && <div className="h-[25vh]" />}
      </div>
    </div>
  )
}
