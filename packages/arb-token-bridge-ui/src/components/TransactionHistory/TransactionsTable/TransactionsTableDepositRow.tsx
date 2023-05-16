import { useMemo } from 'react'

import { DepositStatus, MergedTransaction } from '../../../state/app/state'
import { StatusBadge } from '../../common/StatusBadge'
import { useRedeemRetryable } from '../../../hooks/useRedeemRetryable'
import { useNetworksAndSigners } from '../../../hooks/useNetworksAndSigners'
import { shortenTxHash } from '../../../util/CommonUtils'
import { DepositCountdown } from '../../common/DepositCountdown'
import { ExternalLink } from '../../common/ExternalLink'
import { Button } from '../../common/Button'
import { Tooltip } from '../../common/Tooltip'
import { getExplorerUrl, getNetworkName } from '../../../util/networks'
import { InformationCircleIcon } from '@heroicons/react/24/outline'
import { isDepositReadyToRedeem, isPending } from '../../../state/app/utils'
import { TransactionDateTime } from './TransactionsTable'
import { formatAmount } from '../../../util/NumberUtils'

function DepositRowStatus({ tx }: { tx: MergedTransaction }) {
  switch (tx.depositStatus) {
    case DepositStatus.L1_PENDING:
      return (
        <StatusBadge variant="yellow" aria-label="L1 Transaction Status">
          Pending
        </StatusBadge>
      )

    case DepositStatus.L1_FAILURE:
      return (
        <StatusBadge variant="red" aria-label="L1 Transaction Status">
          Failed
        </StatusBadge>
      )

    case DepositStatus.L2_PENDING:
      return (
        <div className="flex flex-col space-y-1">
          <StatusBadge variant="green" aria-label="L1 Transaction Status">
            Success
          </StatusBadge>
          <StatusBadge variant="yellow" aria-label="L2 Transaction Status">
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
            Failed
          </StatusBadge>
        </div>
      )

    case DepositStatus.L2_FAILURE:
      return (
        <div className="flex flex-col space-y-1">
          <StatusBadge variant="green" aria-label="L1 Transaction Status">
            Success
          </StatusBadge>
          <StatusBadge variant="red" aria-label="L2 Transaction Status">
            Failed
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

  return (
    <div className="flex flex-col space-y-3">
      <Tooltip content={<span>L1 Transaction Time</span>}>
        <TransactionDateTime standardizedDate={tx.createdAt} />
      </Tooltip>
      {tx.resolvedAt && (
        <Tooltip content={<span>L2 Transaction Time</span>}>
          <TransactionDateTime standardizedDate={tx.resolvedAt} />
        </Tooltip>
      )}
    </div>
  )
}

function DepositRowTxID({ tx }: { tx: MergedTransaction }) {
  const { l1, l2 } = useNetworksAndSigners()
  const l2TxHash = tx.l1ToL2MsgData?.l2TxID

  return (
    <div className="flex flex-col space-y-3">
      <span
        className="flex flex-nowrap items-center gap-1 whitespace-nowrap text-dark"
        aria-label="L1 Transaction Link"
      >
        <span className="rounded-md px-2 text-xs text-gray-9">Step 1</span>
        {getNetworkName(l1.network.chainID)}:{' '}
        <ExternalLink
          href={`${getExplorerUrl(l1.network.chainID)}/tx/${tx.txId}`}
          className="arb-hover text-blue-link"
        >
          {shortenTxHash(tx.txId)}
        </ExternalLink>
      </span>

      {l2TxHash && (
        <span
          className="flex flex-nowrap items-center gap-1 whitespace-nowrap text-dark"
          aria-label="L2 Transaction Link"
        >
          <span className="rounded-md px-2 text-xs text-gray-9">Step 2</span>
          {getNetworkName(l2.network.chainID)}:{' '}
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
    () => isDepositReadyToRedeem(tx),
    [tx]
  )

  const showRetryableExpiredText = useMemo(
    () => tx.depositStatus === DepositStatus.EXPIRED,
    [tx]
  )

  const bgClassName = useMemo(() => {
    if (isError || showRedeemRetryableButton || showRetryableExpiredText)
      return 'bg-brick'
    if (isPending(tx)) return 'bg-orange'
    return ''
  }, [tx, isError, showRedeemRetryableButton, showRetryableExpiredText])

  return (
    <tr
      className={`text-sm text-dark ${
        bgClassName || `bg-cyan even:bg-white`
      } ${className}`}
      data-testid={`deposit-row-${tx.txId}`}
    >
      <td className="w-1/5 py-3 pl-6 pr-3">
        <DepositRowStatus tx={tx} />
      </td>

      <td className="w-1/5 px-3 py-3">
        <DepositRowTime tx={tx} />
      </td>

      <td className="w-1/5 whitespace-nowrap px-3 py-3">
        {formatAmount(Number(tx.value), { symbol: tx.asset.toUpperCase() })}
      </td>

      <td className="w-1/5 px-3 py-3">
        <DepositRowTxID tx={tx} />
      </td>

      <td className="relative w-1/5 py-3 pl-3 pr-6 text-right">
        {showRedeemRetryableButton && (
          <Tooltip
            wrapperClassName=""
            content={
              <span>
                Retry now! You have 7 days to re-execute a failed tx. After
                that, the tx is no longer recoverable.
              </span>
            }
          >
            <Button
              variant="primary"
              loading={isRedeeming}
              onClick={() => redeem(tx)}
            >
              Retry
            </Button>
          </Tooltip>
        )}

        {showRetryableExpiredText && (
          <Tooltip
            wrapperClassName=""
            content={
              <span>
                You have 7 days to re-execute a failed tx. After that, the tx is
                no longer recoverable.
              </span>
            }
          >
            <span className="text-md flex flex-nowrap items-center gap-1 font-normal uppercase text-brick-dark">
              <InformationCircleIcon className="h-4 w-4" /> EXPIRED
            </span>
          </Tooltip>
        )}
      </td>
    </tr>
  )
}
