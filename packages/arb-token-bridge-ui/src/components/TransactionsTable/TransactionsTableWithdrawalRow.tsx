import { BigNumber } from 'ethers'

import { useAppState } from '../../state'
import { MergedTransaction } from '../../state/app/state'
import { StatusBadge } from '../common/StatusBadge'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { useClaimWithdrawal } from '../../hooks/useClaimWithdrawal'
import { WithdrawalCountdown } from '../common/WithdrawalCountdown'
import { ExternalLink } from '../common/ExternalLink'
import { shortenTxHash } from '../../util/CommonUtils'
import { Tooltip } from '../common/Tooltip'

function findMatchingL1Tx(
  l2ToL1Message: MergedTransaction,
  transactions: MergedTransaction[]
) {
  return transactions.find(_tx => {
    let l2ToL1MsgData = _tx.l2ToL1MsgData

    if (typeof l2ToL1MsgData === 'undefined') {
      return false
    }

    // To get rid of Proxy
    const txUniqueId = BigNumber.from(l2ToL1Message.uniqueId)
    const _txUniqueId = BigNumber.from(l2ToL1MsgData.uniqueId)

    return txUniqueId.toString() === _txUniqueId.toString()
  })
}

function WithdrawalRowStatus({ tx }: { tx: MergedTransaction }) {
  const {
    app: { mergedTransactions }
  } = useAppState()
  const matchingL1Tx = findMatchingL1Tx(tx, mergedTransactions)

  switch (tx.status) {
    case 'Unconfirmed':
      return (
        <div className="flex flex-col space-y-1">
          <StatusBadge variant="green">Success</StatusBadge>
          <StatusBadge variant="yellow">Unconfirmed</StatusBadge>
        </div>
      )

    case 'Confirmed':
      return (
        <div className="flex flex-col space-y-1">
          <StatusBadge variant="green">Success</StatusBadge>
          <StatusBadge variant="yellow">Confirmed</StatusBadge>
        </div>
      )

    case 'Executed': {
      if (typeof matchingL1Tx === 'undefined') {
        return (
          <div className="flex flex-col space-y-1">
            <StatusBadge variant="green">Success</StatusBadge>
            <StatusBadge variant="yellow">Executed</StatusBadge>
          </div>
        )
      }

      // TODO: Handle failure on L1
      return (
        <div className="flex flex-col space-y-1">
          <StatusBadge variant="green">Success</StatusBadge>
          <StatusBadge variant="green">Success</StatusBadge>
        </div>
      )
    }

    default:
      return null
  }
}

function WithdrawalRowTime({ tx }: { tx: MergedTransaction }) {
  const {
    app: { mergedTransactions }
  } = useAppState()

  if (tx.status === 'Unconfirmed') {
    return (
      <WithdrawalCountdown
        nodeBlockDeadline={tx.nodeBlockDeadline || 'NODE_NOT_CREATED'}
      />
    )
  }

  if (tx.status === 'Confirmed') {
    return <span>Ready</span>
  }

  const matchingL1Tx = findMatchingL1Tx(tx, mergedTransactions)

  if (typeof matchingL1Tx === 'undefined') {
    return <span>N/A</span>
  }

  return (
    <span>{matchingL1Tx.resolvedAt || matchingL1Tx.createdAt || 'N/A'}</span>
  )
}

function WithdrawalRowTxID({ tx }: { tx: MergedTransaction }) {
  const {
    app: { mergedTransactions }
  } = useAppState()
  const { l1, l2 } = useNetworksAndSigners()

  function L1TxInfo() {
    if (tx.status !== 'Executed') {
      return null
    }

    const matchingL1Tx = findMatchingL1Tx(tx, mergedTransactions)

    if (typeof matchingL1Tx === 'undefined') {
      return <span className="text-v3-dark">L1: Not found</span>
    }

    return (
      <span className="text-v3-dark">
        L1:{' '}
        <ExternalLink
          href={`${l1.network?.explorerUrl}/tx/${matchingL1Tx.txId}`}
          className="arb-hover text-v3-blue-link"
        >
          {shortenTxHash(matchingL1Tx.txId)}
        </ExternalLink>
      </span>
    )
  }

  return (
    <div className="flex flex flex-col flex-col space-y-1">
      <span className="text-v3-dark">
        L2:{' '}
        <ExternalLink
          href={`${l2.network?.explorerUrl}/tx/${tx.txId}`}
          className="arb-hover text-v3-blue-link"
        >
          {shortenTxHash(tx.txId)}
        </ExternalLink>
      </span>

      <L1TxInfo />
    </div>
  )
}

function WithdrawalRowAction({ tx }: { tx: MergedTransaction }) {
  const { isConnectedToArbitrum } = useNetworksAndSigners()
  const { claim } = useClaimWithdrawal()

  if (tx.status === 'Confirmed') {
    return (
      <Tooltip
        show={isConnectedToArbitrum || false}
        content={
          <span>
            Please connect to the L1 network to claim your withdrawal.
          </span>
        }
      >
        <button
          disabled={isConnectedToArbitrum}
          onClick={() => claim(tx)}
          className="arb-hover w-max rounded-lg bg-v3-dark px-2 py-1 text-sm text-white disabled:bg-v3-gray-5"
        >
          Claim
        </button>
      </Tooltip>
    )
  }

  if (tx.nodeBlockDeadline === 'EXECUTE_CALL_EXCEPTION') {
    return <span>EXECUTE_CALL_EXCEPTION</span>
  }

  return null
}

export function TransactionsTableWithdrawalRow({
  tx,
  className = ''
}: {
  tx: MergedTransaction
  className?: string
}) {
  const L2ToL1MessageStatuses = ['Unconfirmed', 'Confirmed', 'Executed']

  if (!L2ToL1MessageStatuses.includes(tx.status)) {
    return null
  }

  return (
    <tr className={`text-sm text-v3-dark ${className}`}>
      <td className="w-1/5 py-3 pl-6 pr-3">
        <WithdrawalRowStatus tx={tx} />
      </td>

      <td className="w-1/5 px-3 py-3">
        <WithdrawalRowTime tx={tx} />
      </td>

      <td className="w-1/5 px-3 py-3">
        {tx.value} {tx.asset.toUpperCase()}
      </td>

      <td className="w-1/5 px-3 py-3">
        <WithdrawalRowTxID tx={tx} />
      </td>

      <td className="w-1/5 py-3 pl-3 pr-6">
        <WithdrawalRowAction tx={tx} />
      </td>
    </tr>
  )
}
