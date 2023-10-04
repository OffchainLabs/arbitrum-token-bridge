import { useMemo } from 'react'
import { useAccount } from 'wagmi'
import { twMerge } from 'tailwind-merge'

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
import {
  isCustomDestinationAddressTx,
  isDepositReadyToRedeem,
  isPending
} from '../../../state/app/utils'
import { TransactionDateTime } from './TransactionsTable'
import { formatAmount } from '../../../util/NumberUtils'
import { useIsConnectedToArbitrum } from '../../../hooks/useIsConnectedToArbitrum'
import { sanitizeTokenSymbol } from '../../../util/TokenUtils'
import { TransactionsTableCustomAddressLabel } from './TransactionsTableCustomAddressLabel'
import { TransactionsTableRowAction } from './TransactionsTableRowAction'
import { useChainLayers } from '../../../hooks/useChainLayers'

function DepositRowStatus({ tx }: { tx: MergedTransaction }) {
  const { parentLayer, layer } = useChainLayers()

  switch (tx.depositStatus) {
    case DepositStatus.L1_PENDING:
      return (
        <StatusBadge
          variant="yellow"
          aria-label={`${parentLayer} Transaction Status`}
        >
          Pending
        </StatusBadge>
      )

    case DepositStatus.L1_FAILURE:
      return (
        <StatusBadge
          variant="red"
          aria-label={`${parentLayer} Transaction Status`}
        >
          Failed
        </StatusBadge>
      )

    case DepositStatus.L2_PENDING:
      return (
        <div className="flex flex-col space-y-1">
          <StatusBadge
            variant="green"
            aria-label={`${parentLayer} Transaction Status`}
          >
            Success
          </StatusBadge>
          <StatusBadge
            variant="yellow"
            aria-label={`${layer} Transaction Status`}
          >
            Pending
          </StatusBadge>
        </div>
      )

    case DepositStatus.CREATION_FAILED:
      return (
        <div className="flex flex-col space-y-1">
          <StatusBadge
            variant="green"
            aria-label={`${parentLayer} Transaction Status`}
          >
            Success
          </StatusBadge>
          <StatusBadge variant="red" aria-label={`${layer} Transaction Status`}>
            Failed
          </StatusBadge>
        </div>
      )

    case DepositStatus.L2_FAILURE:
      return (
        <div className="flex flex-col space-y-1">
          <StatusBadge
            variant="green"
            aria-label={`${parentLayer} Transaction Status`}
          >
            Success
          </StatusBadge>
          <StatusBadge variant="red" aria-label={`${layer} Transaction Status`}>
            Failed
          </StatusBadge>
        </div>
      )

    case DepositStatus.L2_SUCCESS:
      return (
        <div className="flex flex-col space-y-1">
          <StatusBadge
            variant="green"
            aria-label={`${parentLayer} Transaction Status`}
          >
            Success
          </StatusBadge>
          <StatusBadge
            variant="green"
            aria-label={`${layer} Transaction Status`}
          >
            Success
          </StatusBadge>
        </div>
      )

    case DepositStatus.EXPIRED:
      return (
        <div className="flex flex-col space-y-1">
          <StatusBadge
            variant="red"
            aria-label={`${parentLayer} Transaction Status`}
          >
            Failed
          </StatusBadge>
        </div>
      )

    default:
      return null
  }
}

function DepositRowTime({ tx }: { tx: MergedTransaction }) {
  const { parentLayer, layer } = useChainLayers()

  if (
    tx.depositStatus === DepositStatus.L1_PENDING ||
    tx.depositStatus === DepositStatus.L2_PENDING
  ) {
    return <DepositCountdown tx={tx} />
  }

  return (
    <div className="flex flex-col space-y-3">
      <Tooltip content={<span>{parentLayer} Transaction Time</span>}>
        <TransactionDateTime standardizedDate={tx.createdAt} />
      </Tooltip>
      {tx.resolvedAt && (
        <Tooltip content={<span>{layer} Transaction Time</span>}>
          <TransactionDateTime standardizedDate={tx.resolvedAt} />
        </Tooltip>
      )}
    </div>
  )
}

function DepositRowTxID({ tx }: { tx: MergedTransaction }) {
  const { l1, l2 } = useNetworksAndSigners()
  const { parentLayer, layer } = useChainLayers()
  const l2TxHash = (() => {
    if (tx.l1ToL2MsgData?.l2TxID) {
      return tx.l1ToL2MsgData?.l2TxID
    }

    return tx.isCctp && tx.cctpData?.receiveMessageTransactionHash
  })()

  return (
    <div className="flex flex-col space-y-3">
      <span
        className="flex flex-nowrap items-center gap-1 whitespace-nowrap text-dark"
        aria-label={`${parentLayer} Transaction Link`}
      >
        <span className="rounded-md px-2 text-xs text-dark">Step 1</span>
        {getNetworkName(l1.network.id)}:{' '}
        <ExternalLink
          href={`${getExplorerUrl(l1.network.id)}/tx/${tx.txId}`}
          className="arb-hover text-blue-link"
        >
          {shortenTxHash(tx.txId)}
        </ExternalLink>
      </span>

      {l2TxHash && (
        <span
          className="flex flex-nowrap items-center gap-1 whitespace-nowrap text-dark"
          aria-label={`${layer} Transaction Link`}
        >
          <span className="rounded-md px-2 text-xs text-dark">Step 2</span>
          {getNetworkName(l2.network.id)}:{' '}
          <ExternalLink
            href={`${getExplorerUrl(l2.network.id)}/tx/${l2TxHash}`}
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
  const { l1 } = useNetworksAndSigners()
  const { address } = useAccount()
  const { redeem, isRedeeming } = useRedeemRetryable()
  const isConnectedToArbitrum = useIsConnectedToArbitrum()

  const isRedeemButtonDisabled = useMemo(
    () =>
      typeof isConnectedToArbitrum !== 'undefined'
        ? !isConnectedToArbitrum
        : true,
    [isConnectedToArbitrum]
  )

  const isError = useMemo(() => {
    if (
      tx.depositStatus === DepositStatus.L1_FAILURE ||
      tx.depositStatus === DepositStatus.EXPIRED
    ) {
      return true
    }

    if (tx.depositStatus === DepositStatus.CREATION_FAILED) {
      // In case of a retryable ticket creation failure, mark only the token deposits as errors
      return tx.asset.toLowerCase() !== 'eth'
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

  const tokenSymbol = useMemo(
    () =>
      sanitizeTokenSymbol(tx.asset, {
        erc20L1Address: tx.tokenAddress,
        chain: l1.network
      }),
    [l1.network, tx.asset, tx.tokenAddress]
  )

  const customAddressTxPadding = useMemo(
    () => (isCustomDestinationAddressTx(tx) ? 'pb-11' : ''),
    [tx]
  )

  if (!tx.sender || !address) {
    return null
  }

  return (
    <tr
      className={twMerge(
        'relative text-sm text-dark',
        bgClassName || 'bg-cyan even:bg-white',
        className
      )}
      data-testid={`deposit-row-${tx.txId}`}
    >
      <td className={twMerge('w-1/5 py-3 pl-6 pr-3', customAddressTxPadding)}>
        <DepositRowStatus tx={tx} />
      </td>

      <td className={twMerge('w-1/5 px-3 py-3', customAddressTxPadding)}>
        <DepositRowTime tx={tx} />
      </td>

      <td
        className={twMerge(
          'w-1/5 whitespace-nowrap px-3 py-3',
          customAddressTxPadding
        )}
      >
        {formatAmount(Number(tx.value), {
          symbol: tokenSymbol
        })}
      </td>

      <td className={twMerge('w-1/5 px-3 py-3', customAddressTxPadding)}>
        <DepositRowTxID tx={tx} />
      </td>

      <td
        className={twMerge(
          'relative w-1/5 py-3 pl-3 pr-6 text-right',
          customAddressTxPadding
        )}
      >
        {showRedeemRetryableButton && (
          <Tooltip
            show={isRedeemButtonDisabled}
            wrapperClassName=""
            content={
              <span>
                Please connect to the L2 network to re-execute your deposit. You
                have 7 days to re-execute a failed tx. After that, the tx is no
                longer recoverable.
              </span>
            }
          >
            <Button
              variant="primary"
              loading={isRedeeming}
              disabled={isRedeemButtonDisabled}
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

        {tx.isCctp && (
          <TransactionsTableRowAction
            tx={tx}
            isError={isError}
            type="deposits"
          />
        )}
      </td>
      {isCustomDestinationAddressTx(tx) && (
        <td>
          <TransactionsTableCustomAddressLabel tx={tx} />
        </td>
      )}
    </tr>
  )
}
