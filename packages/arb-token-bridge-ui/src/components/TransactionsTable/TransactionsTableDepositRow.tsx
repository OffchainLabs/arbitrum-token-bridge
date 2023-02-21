import { useMemo } from 'react'

import { DepositStatus, MergedTransaction } from '../../state/app/state'
import { StatusBadge } from '../common/StatusBadge'
import { useRedeemRetryable } from '../../hooks/useRedeemRetryable'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { shortenTxHash } from '../../util/CommonUtils'
import { DepositCountdown } from '../common/DepositCountdown'
import { ExternalLink } from '../common/ExternalLink'
import { Button } from '../common/Button'
import { Tooltip } from '../common/Tooltip'
import { getExplorerUrl } from '../../util/networks'

function DepositRowStatus({ tx }: { tx: MergedTransaction }) {
  switch (tx.depositStatus) {
    case DepositStatus.L1_PENDING:
      return (
        <StatusBadge variant="blue" aria-label="L1 Transaction Status">
          Pending
        </StatusBadge>
      )

    case DepositStatus.L1_FAILURE:
      return (
        <StatusBadge variant="red" aria-label="L1 Transaction Status">
          Error
        </StatusBadge>
      )

    case DepositStatus.L2_PENDING:
      return (
        <div className="flex flex-col space-y-1">
          <StatusBadge variant="green" aria-label="L1 Transaction Status">
            Success
          </StatusBadge>
          <StatusBadge variant="blue" aria-label="L2 Transaction Status">
            Pending
          </StatusBadge>
        </div>
      )

    case DepositStatus.CREATION_FAILED:
      return (
        <div className="flex flex-col space-y-1">
          <StatusBadge variant="green" aria-label="L1 Transaction Status">
            Success
          </StatusBadge>
          <StatusBadge variant="red" aria-label="L2 Transaction Status">
            Error
          </StatusBadge>
        </div>
      )

    case DepositStatus.L2_FAILURE:
      return (
        <div className="flex flex-col space-y-1">
          <StatusBadge variant="green" aria-label="L1 Transaction Status">
            Success
          </StatusBadge>
          <StatusBadge variant="yellow" aria-label="L2 Transaction Status">
            Error
          </StatusBadge>
        </div>
      )

    case DepositStatus.L2_SUCCESS:
      return (
        <div className="flex flex-col space-y-1">
          <StatusBadge variant="green" aria-label="L1 Transaction Status">
            Success
          </StatusBadge>
          <StatusBadge variant="green" aria-label="L2 Transaction Status">
            Success
          </StatusBadge>
        </div>
      )

    case DepositStatus.EXPIRED:
      return (
        <div className="flex flex-col space-y-1">
          <StatusBadge variant="red" aria-label="L1 Transaction Status">
            Failed
          </StatusBadge>
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
      <span className="text-dark" aria-label="L1 Transaction Link">
        L1:{' '}
        <ExternalLink
          href={`${getExplorerUrl(l1.network.chainID)}/tx/${tx.txId}`}
          className="arb-hover text-blue-link"
        >
          {shortenTxHash(tx.txId)}
        </ExternalLink>
      </span>

      {l2TxHash && (
        <span className="text-dark" aria-label="L2 Transaction Link">
          L2:{' '}
          <ExternalLink
            href={`${getExplorerUrl(l2.network.chainID)}/tx/${l2TxHash}`}
            className="arb-hover text-blue-link"
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
  const { isConnectedToArbitrum } = useNetworksAndSigners()
  const { redeem, isRedeeming } = useRedeemRetryable()

  const isError = useMemo(() => {
    if (
      tx.depositStatus === DepositStatus.L1_FAILURE ||
      tx.depositStatus === DepositStatus.EXPIRED
    ) {
      return true
    }

    if (tx.depositStatus === DepositStatus.CREATION_FAILED) {
      // In case of a retryable ticket creation failure, mark only the token deposits as errors
      return tx.asset !== 'eth'
    }

    return false
  }, [tx])

  const showRedeemRetryableButton = useMemo(
    () => tx.depositStatus === DepositStatus.L2_FAILURE,
    [tx]
  )

  const showRetryableExpiredText = useMemo(
    () => tx.depositStatus === DepositStatus.EXPIRED,
    [tx]
  )

  const bgClassName = isError ? 'bg-brick' : ''

  return (
    <tr className={`text-sm text-dark ${bgClassName} ${className}`}>
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
            <Button
              variant="primary"
              loading={isRedeeming}
              disabled={!isConnectedToArbitrum}
              onClick={() => redeem(tx)}
            >
              Re-execute
            </Button>
          </Tooltip>
        )}

        {showRetryableExpiredText && (
          <Tooltip
            content={
              <span>
                When an L2 tx fails, you have 7 days to re-execute. After that
                time period, the tx is no longer recoverable.
              </span>
            }
          >
            <span className="text-md font-normal uppercase text-brick-dark">
              Expired
            </span>
          </Tooltip>
        )}
      </td>
    </tr>
  )
}
