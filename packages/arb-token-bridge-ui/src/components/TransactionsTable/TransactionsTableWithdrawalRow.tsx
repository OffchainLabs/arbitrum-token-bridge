import { BigNumber } from 'ethers'

import { useAppState } from '../../state'
import { MergedTransaction } from '../../state/app/state'
import { StatusBadge } from '../common/StatusBadge'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { useClaimWithdrawal } from '../../hooks/useClaimWithdrawal'
import { WithdrawalCountdown } from '../common/WithdrawalCountdown'
import { ExternalLink } from '../common/ExternalLink'
import { shortenTxHash } from '../../util/CommonUtils'
import { Button } from '../common/Button'
import { Tooltip } from '../common/Tooltip'
import { getExplorerUrl, getNetworkName } from '../../util/networks'

function findMatchingL1Tx(
  l2ToL1Message: MergedTransaction,
  transactions: MergedTransaction[]
) {
  return transactions.find(_tx => {
    const l2ToL1MsgData = _tx.l2ToL1MsgData

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
    <span className="whitespace-nowrap">
      {matchingL1Tx.resolvedAt || matchingL1Tx.createdAt || 'N/A'}
    </span>
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
      return (
        <span className="whitespace-nowrap text-dark">
          {getNetworkName(l1.network.chainID)}: Not available
        </span>
      )
    }

    return (
      <span className="whitespace-nowrap text-dark">
        {getNetworkName(l1.network.chainID)}:{' '}
        <ExternalLink
          href={`${getExplorerUrl(l1.network.chainID)}/tx/${matchingL1Tx.txId}`}
          className="arb-hover text-blue-link"
        >
          {shortenTxHash(matchingL1Tx.txId)}
        </ExternalLink>
      </span>
    )
  }

  return (
    <div className="flex flex-col space-y-1">
      <span className="whitespace-nowrap text-dark">
        {getNetworkName(l2.network.chainID)}:{' '}
        <ExternalLink
          href={`${getExplorerUrl(l2.network.chainID)}/tx/${tx.txId}`}
          className="arb-hover text-blue-link"
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
  const { claim, isClaiming } = useClaimWithdrawal()

  if (tx.status === 'Unconfirmed') {
    return (
      <Tooltip content={<span>Funds aren’t ready to claim yet.</span>}>
        <Button variant="primary" disabled>
          Claim
        </Button>
      </Tooltip>
    )
  }

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
        <Button
          variant="primary"
          loading={isClaiming}
          disabled={isConnectedToArbitrum}
          onClick={() => claim(tx)}
        >
          Claim
        </Button>
      </Tooltip>
    )
  }

  if (tx.nodeBlockDeadline === 'EXECUTE_CALL_EXCEPTION') {
    return <span className="whitespace-nowrap">EXECUTE_CALL_EXCEPTION</span>
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
    <tr className={`bg-cyan text-sm text-dark even:bg-white ${className}`}>
      <td className="w-1/5 py-3 pl-6 pr-3">
        <WithdrawalRowStatus tx={tx} />
      </td>

      <td className="w-1/5 px-3 py-3">
        <WithdrawalRowTime tx={tx} />
      </td>

      <td className="w-1/5 whitespace-nowrap px-3 py-3">
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
