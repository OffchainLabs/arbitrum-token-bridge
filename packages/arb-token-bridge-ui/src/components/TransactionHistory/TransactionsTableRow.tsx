import { useEffect, useMemo, useState } from 'react'
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
import { getExplorerUrl, getNetworkName, isNetwork } from '../../util/networks'
import { NetworkImage } from '../common/NetworkImage'
import {
  getDestinationChainId,
  getDestinationNetworkTxId,
  getSourceChainId,
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

const StatusLabel = ({ tx }: { tx: MergedTransaction }) => {
  const sourceChainId = tx.isWithdrawal ? tx.childChainId : tx.parentChainId
  const destinationChainId = tx.isWithdrawal
    ? tx.parentChainId
    : tx.childChainId

  if (isTxFailed(tx)) {
    return (
      <ExternalLink
        href={`${getExplorerUrl(sourceChainId)}/tx/${tx.txId}`}
        className="arb-hover flex items-center space-x-1 text-red-400"
      >
        <XCircleIcon height={14} className="mr-1" />
        <span>Failed</span>
        <ArrowTopRightOnSquareIcon height={10} className="pl-1" />
      </ExternalLink>
    )
  }

  if (isTxExpired(tx)) {
    return (
      <ExternalLink
        href={`${getExplorerUrl(sourceChainId)}/tx/${tx.txId}`}
        className="arb-hover flex items-center space-x-1 text-red-400"
      >
        <XCircleIcon height={14} className="mr-1" />
        <span>Expired</span>
        <ArrowTopRightOnSquareIcon height={10} className="pl-1" />
      </ExternalLink>
    )
  }

  if (isTxPending(tx)) {
    return (
      <ExternalLink
        href={`${getExplorerUrl(sourceChainId)}/tx/${tx.txId}`}
        className="arb-hover flex items-center space-x-1 text-yellow-400"
      >
        <div className="mr-1 h-[10px] w-[10px] rounded-full border border-yellow-400" />
        <span>Pending</span>
        <ArrowTopRightOnSquareIcon height={10} className="pl-1" />
      </ExternalLink>
    )
  }

  if (isTxClaimable(tx)) {
    return (
      <ExternalLink
        href={`${getExplorerUrl(sourceChainId)}/tx/${tx.txId}`}
        className="arb-hover flex items-center space-x-1 text-green-400"
      >
        <div className="mr-1 h-[10px] w-[10px] rounded-full border border-green-400" />
        <span>Claimable</span>
        <ArrowTopRightOnSquareIcon height={10} className="pl-1" />
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
      className={destinationNetworkTxId ? 'arb-hover' : 'pointer-events-none'}
    >
      <div className="flex items-center space-x-1">
        <CheckCircleIcon height={14} className="mr-1" />
        <span>Success</span>

        {destinationNetworkTxId && (
          <ArrowTopRightOnSquareIcon height={10} className="pl-1" />
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
  address: `0x${string}` | undefined
  className?: string
}) {
  const { open: openTxDetails } = useTxDetailsStore()

  const sourceChainId = getSourceChainId(tx)
  const destinationChainId = getDestinationChainId(tx)

  const [txRelativeTime, setTxRelativeTime] = useState(
    dayjs(tx.createdAt).fromNow()
  )

  const { isEthereumMainnetOrTestnet: isSourceChainIdEthereum } =
    isNetwork(sourceChainId)

  const isClaimableTx = tx.isCctp || tx.isWithdrawal

  useEffect(() => {
    // make sure relative time updates periodically
    const interval = setInterval(() => {
      setTxRelativeTime(dayjs(tx.createdAt).fromNow())
    }, 10_000)

    return () => clearInterval(interval)
  }, [tx])

  const tokenSymbol = useMemo(
    () =>
      sanitizeTokenSymbol(tx.asset, {
        erc20L1Address: tx.tokenAddress,
        chainId: isSourceChainIdEthereum ? tx.parentChainId : tx.childChainId
      }),
    [
      tx.asset,
      tx.tokenAddress,
      tx.parentChainId,
      tx.childChainId,
      isSourceChainIdEthereum
    ]
  )

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
        'relative mx-4 grid h-[60px] grid-cols-[140px_140px_140px_140px_100px_180px_140px] items-center justify-between border-b border-white/30 text-xs text-white',
        className
      )}
    >
      <div className="flex h-full items-center pl-2 pr-3 align-middle">
        {txRelativeTime}
      </div>
      <div className="flex h-full items-center pl-2 pr-3 align-middle">
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
      <div className="flex h-full items-center space-x-2 pl-2">
        <TransactionsTableExternalLink
          href={`${getExplorerUrl(sourceChainId)}/address/${tx.sender}`}
        >
          <span>
            <NetworkImage chainId={sourceChainId} />
          </span>
          <span className="inline-block max-w-[55px] break-words">
            {getNetworkName(sourceChainId)}
          </span>
        </TransactionsTableExternalLink>
      </div>
      <div className="flex h-full items-center space-x-2 pl-2">
        <TransactionsTableExternalLink
          href={`${getExplorerUrl(destinationChainId)}/address/${
            tx.destination ?? tx.sender
          }`}
        >
          <span>
            <NetworkImage chainId={destinationChainId} />
          </span>
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
      <div className="pl-3 align-middle">
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
