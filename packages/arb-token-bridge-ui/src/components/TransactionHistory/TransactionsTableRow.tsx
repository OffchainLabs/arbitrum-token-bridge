import { useMemo, useState } from 'react'
import { useInterval } from 'react-use'
import { twMerge } from 'tailwind-merge'
import dayjs from 'dayjs'
import {
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'

import { DepositStatus, MergedTransaction } from '../../state/app/state'
import { formatAmount } from '../../util/NumberUtils'
import { sanitizeTokenSymbol } from '../../util/TokenUtils'
import { getExplorerUrl, getNetworkName } from '../../util/networks'
import { NetworkImage } from '../common/NetworkImage'
import {
  getDestinationNetworkTxId,
  isTxClaimable,
  isTxExpired,
  isTxFailed,
  isTxPending
} from './helpers'
import { ExternalLink } from '../common/ExternalLink'
import { Button } from '../common/Button'
import { TransactionsTableRowAction } from './TransactionsTableRowAction'
import { AssetType } from '../../hooks/arbTokenBridge.types'
import { TransactionsTableTokenImage } from './TransactionsTableTokenImage'
import { useTxDetailsStore } from './TransactionHistory'
import { TransactionsTableExternalLink } from './TransactionsTableExternalLink'
import { Address } from '../../util/AddressUtils'

const StatusLabel = ({ tx }: { tx: MergedTransaction }) => {
  const { sourceChainId, destinationChainId } = tx

  if (isTxFailed(tx)) {
    return (
      <ExternalLink
        href={`${getExplorerUrl(sourceChainId)}/tx/${tx.txId}`}
        aria-label="Transaction status"
        className="arb-hover flex shrink-0 items-center space-x-1 text-red-400"
      >
        <XCircleIcon height={14} />
        <span>Failed</span>
        <ArrowTopRightOnSquareIcon height={10} className="shrink-0" />
      </ExternalLink>
    )
  }

  if (isTxExpired(tx)) {
    return (
      <ExternalLink
        href={`${getExplorerUrl(sourceChainId)}/tx/${tx.txId}`}
        aria-label="Transaction status"
        className="arb-hover flex shrink-0 items-center space-x-1 text-red-400"
      >
        <XCircleIcon height={14} />
        <span>Expired</span>
        <ArrowTopRightOnSquareIcon height={10} className="shrink-0" />
      </ExternalLink>
    )
  }

  if (isTxPending(tx)) {
    return (
      <ExternalLink
        href={`${getExplorerUrl(sourceChainId)}/tx/${tx.txId}`}
        aria-label="Transaction status"
        className="arb-hover flex items-center space-x-1 text-yellow-400"
      >
        <div className="h-[10px] w-[10px] rounded-full border border-yellow-400 " />
        <span>Pending</span>
        <ArrowTopRightOnSquareIcon height={10} className="shrink-0" />
      </ExternalLink>
    )
  }

  if (isTxClaimable(tx)) {
    return (
      <ExternalLink
        href={`${getExplorerUrl(sourceChainId)}/tx/${tx.txId}`}
        aria-label="Transaction status"
        className="arb-hover flex items-center space-x-1 text-green-400"
      >
        <div className="h-[10px] w-[10px] shrink-0 rounded-full border border-green-400" />
        <span>Claimable</span>
        <ArrowTopRightOnSquareIcon height={10} className="shrink-0" />
      </ExternalLink>
    )
  }

  const destinationNetworkTxId = getDestinationNetworkTxId(tx)

  // Success
  return (
    <ExternalLink
      href={
        destinationNetworkTxId
          ? `${getExplorerUrl(destinationChainId)}/tx/${destinationNetworkTxId}`
          : ''
      }
      aria-label="Transaction status"
      className={destinationNetworkTxId ? 'arb-hover' : 'pointer-events-none'}
    >
      <div className="flex items-center space-x-1">
        <CheckCircleIcon height={14} className="shrink-0" />
        <span>Success</span>

        {destinationNetworkTxId && (
          <ArrowTopRightOnSquareIcon height={10} className="shrink-0" />
        )}
      </div>
    </ExternalLink>
  )
}

export function TransactionsTableRow({
  tx,
  address,
  className = ''
}: {
  tx: MergedTransaction
  address: Address | undefined
  className?: string
}) {
  const { open: openTxDetails } = useTxDetailsStore()

  const { sourceChainId, destinationChainId } = tx

  const [txRelativeTime, setTxRelativeTime] = useState(
    dayjs(tx.createdAt).fromNow()
  )

  const isClaimableTx = tx.isCctp || tx.isWithdrawal

  // make sure relative time updates periodically
  useInterval(() => setTxRelativeTime(dayjs(tx.createdAt).fromNow()), 10_000)

  const tokenSymbol = sanitizeTokenSymbol(tx.asset, {
    erc20L1Address: tx.tokenAddress,
    chainId: tx.sourceChainId
  })

  const isError = useMemo(() => {
    if (tx.isCctp || !tx.isWithdrawal) {
      if (
        tx.depositStatus === DepositStatus.L1_FAILURE ||
        tx.depositStatus === DepositStatus.EXPIRED
      ) {
        return true
      }

      if (tx.depositStatus === DepositStatus.CREATION_FAILED) {
        // In case of a retryable ticket creation failure, mark only the token deposits as errors
        return tx.assetType === AssetType.ETH
      }
    }

    // Withdrawal
    return tx.status === 'Failure'
  }, [tx])

  return (
    <div
      data-testid={`${isClaimableTx ? 'claimable' : 'deposit'}-row-${tx.txId}`}
      className={twMerge(
        'relative mx-4 grid h-[60px] grid-cols-[140px_140px_140px_140px_100px_170px_140px] items-center justify-between border-b border-white/30 text-xs text-white',
        className
      )}
    >
      <div className="pr-3 align-middle">{txRelativeTime}</div>
      <div className="flex items-center pr-3 align-middle">
        <TransactionsTableExternalLink
          href={`${getExplorerUrl(sourceChainId)}/token/${tx.tokenAddress}`}
          disabled={!tx.tokenAddress}
        >
          <TransactionsTableTokenImage tx={tx} />
          <span className="ml-2">
            {formatAmount(Number(tx.value), {
              symbol: tokenSymbol
            })}
          </span>
        </TransactionsTableExternalLink>
      </div>
      <div className="flex items-center space-x-2">
        <TransactionsTableExternalLink
          href={`${getExplorerUrl(sourceChainId)}/address/${tx.sender}`}
        >
          <span>
            <NetworkImage chainId={sourceChainId} className="h-5 w-5" />
          </span>
          <span className="inline-block max-w-[55px] break-words">
            {getNetworkName(sourceChainId)}
          </span>
        </TransactionsTableExternalLink>
      </div>
      <div className="flex items-center space-x-2">
        <TransactionsTableExternalLink
          href={`${getExplorerUrl(destinationChainId)}/address/${
            tx.destination ?? tx.sender
          }`}
        >
          <NetworkImage chainId={destinationChainId} className="h-5 w-5" />

          <span className="inline-block max-w-[55px] break-words">
            {getNetworkName(destinationChainId)}
          </span>
        </TransactionsTableExternalLink>
      </div>
      <div className="pr-3 align-middle">
        <StatusLabel tx={tx} />
      </div>
      <div className="flex justify-center px-3 align-middle">
        <TransactionsTableRowAction
          tx={tx}
          isError={isError}
          type={tx.isWithdrawal ? 'withdrawals' : 'deposits'}
          address={address}
        />
      </div>
      <div className="pl-2 align-middle">
        <Button
          variant="primary"
          className="rounded border border-white p-2 text-xs text-white"
          onClick={() => openTxDetails(tx)}
        >
          See Details
        </Button>
      </div>
    </div>
  )
}
