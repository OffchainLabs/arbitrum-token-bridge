import { useMemo } from 'react'
import { L1ToL2MessageStatus, IL1ToL2MessageWriter } from '@arbitrum/sdk'

import { useAppState } from '../../state'
import { DepositStatus, MergedTransaction } from '../../state/app/state'
import { StatusBadge } from '../common/StatusBadge'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { getRetryableTicket } from '../../util/RetryableUtils'
import { shortenTxHash } from '../../util/CommonUtils'
import { DepositCountdown } from '../common/DepositCountdown'
import { ExternalLink } from '../common/ExternalLink'
import { Tooltip } from '../common/Tooltip'

function DepositRowStatus({ tx }: { tx: MergedTransaction }) {
  switch (tx.depositStatus) {
    case DepositStatus.L1_PENDING:
      return <StatusBadge variant="blue">Pending</StatusBadge>

    case DepositStatus.L1_FAILURE:
      return <StatusBadge variant="red">Error</StatusBadge>

    case DepositStatus.L2_PENDING:
      return (
        <div className="flex flex-col space-y-1">
          <StatusBadge variant="green">Success</StatusBadge>
          <StatusBadge variant="blue">Pending</StatusBadge>
        </div>
      )

    case DepositStatus.CREATION_FAILED:
      return (
        <div className="flex flex-col space-y-1">
          <StatusBadge variant="green">Success</StatusBadge>
          <StatusBadge variant="red">Error</StatusBadge>
        </div>
      )

    case DepositStatus.L2_FAILURE:
      return (
        <div className="flex flex-col space-y-1">
          <StatusBadge variant="green">Success</StatusBadge>
          <StatusBadge variant="yellow">Error</StatusBadge>
        </div>
      )

    case DepositStatus.L2_SUCCESS:
      return (
        <div className="flex flex-col space-y-1">
          <StatusBadge variant="green">Success</StatusBadge>
          <StatusBadge variant="green">Success</StatusBadge>
        </div>
      )

    case DepositStatus.EXPIRED:
      return (
        <div className="flex flex-col space-y-1">
          <StatusBadge variant="green">Success</StatusBadge>
          <StatusBadge variant="yellow">Expired</StatusBadge>
        </div>
      )

    default:
      return null
  }
}

function DepositRowTime({ tx }: { tx: MergedTransaction }) {
  if (
    tx.depositStatus === DepositStatus.L1_PENDING ||
    tx.depositStatus === DepositStatus.L2_PENDING
  ) {
    return (
      <DepositCountdown
        createdAt={tx.createdAt}
        depositStatus={tx.depositStatus}
      />
    )
  }

  return <span>{tx.resolvedAt || tx.createdAt || 'N/A'}</span>
}

function DepositRowTxID({ tx }: { tx: MergedTransaction }) {
  const { l1, l2 } = useNetworksAndSigners()
  const l2TxHash = tx.l1ToL2MsgData?.l2TxID

  return (
    <div className="flex flex flex-col flex-col space-y-1">
      <span className="text-v3-dark">
        L1:{' '}
        <ExternalLink
          href={`${l1.network?.explorerUrl}/tx/${tx.txId}`}
          className="arb-hover text-v3-blue-link"
        >
          {shortenTxHash(tx.txId)}
        </ExternalLink>
      </span>

      {l2TxHash && (
        <span className="text-v3-dark">
          L2:{' '}
          <ExternalLink
            href={`${l2.network?.explorerUrl}/tx/${l2TxHash}`}
            className="arb-hover text-v3-blue-link"
          >
            {shortenTxHash(l2TxHash)}
          </ExternalLink>
        </span>
      )}
    </div>
  )
}

export function TransactionsTableDepositRow({
  tx,
  className = ''
}: {
  tx: MergedTransaction
  className?: string
}) {
  const {
    app: { arbTokenBridge }
  } = useAppState()
  const {
    l1: { signer: l1Signer },
    l2: { signer: l2Signer },
    isConnectedToArbitrum
  } = useNetworksAndSigners()

  const showRedeemRetryableButton = useMemo(
    () => tx.depositStatus === DepositStatus.L2_FAILURE,
    [tx]
  )

  async function redeemRetryable() {
    if (typeof l1Signer === 'undefined' || typeof l2Signer === 'undefined') {
      return
    }

    let retryableTicket: IL1ToL2MessageWriter

    try {
      retryableTicket = await getRetryableTicket({
        l1TxHash: tx.txId,
        retryableCreationId: tx.l1ToL2MsgData?.retryableCreationTxID,
        l1Provider: l1Signer.provider,
        l2Signer
      })
    } catch (error: any) {
      return alert(error.message)
    }

    const res = await retryableTicket.redeem()
    await res.wait()

    // update in store
    arbTokenBridge.transactions.fetchAndUpdateL1ToL2MsgStatus(
      tx.txId,
      retryableTicket,
      tx.asset === 'eth',
      L1ToL2MessageStatus.REDEEMED
    )
  }

  return (
    <tr className={`text-sm text-v3-dark ${className}`}>
      <td className="w-1/5 py-3 pl-6 pr-3">
        <DepositRowStatus tx={tx} />
      </td>

      <td className="w-1/5 px-3 py-3">
        <DepositRowTime tx={tx} />
      </td>

      <td className="w-1/5 px-3 py-3">
        {tx.value} {tx.asset.toUpperCase()}
      </td>

      <td className="w-1/5 px-3 py-3">
        <DepositRowTxID tx={tx} />
      </td>

      <td className="w-1/5 py-3 pl-3 pr-6">
        {showRedeemRetryableButton && (
          <Tooltip
            show={!isConnectedToArbitrum}
            content={
              <span>
                Please connect to the L2 network to re-execute your deposit.
              </span>
            }
          >
            <button
              onClick={redeemRetryable}
              disabled={!isConnectedToArbitrum}
              className="arb-hover w-max rounded-lg bg-v3-dark px-2 py-1 text-sm text-white disabled:bg-v3-gray-5"
            >
              Re-execute
            </button>
          </Tooltip>
        )}
      </td>
    </tr>
  )
}
