import { useCallback, useEffect, useMemo, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import dayjs from 'dayjs'
import {
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'
import { create } from 'zustand'

import { DepositStatus, MergedTransaction } from '../../state/app/state'
import { formatAmount } from '../../util/NumberUtils'
import { sanitizeTokenSymbol } from '../../util/TokenUtils'
import { getExplorerUrl, getNetworkName, isNetwork } from '../../util/networks'
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

type HighlightedTransactionStore = {
  highlightedTx: {
    txId: string | null
    parentChainId: number | null
    childChainId: number | null
  }
  setHighlightedTx: ({
    txId,
    parentChainId,
    childChainId
  }: {
    txId: string
    parentChainId: number
    childChainId: number
  }) => void
  resetHighlightedTx: () => void
}

export const useHighlightedTransactionsStore =
  create<HighlightedTransactionStore>(set => ({
    highlightedTx: {
      txId: null,
      parentChainId: null,
      childChainId: null
    },
    setHighlightedTx: ({ txId, parentChainId, childChainId }) => {
      return set({ highlightedTx: { txId, parentChainId, childChainId } })
    },
    resetHighlightedTx: () => {
      return set({
        highlightedTx: { txId: null, parentChainId: null, childChainId: null }
      })
    }
  }))

export function TransactionsTableRow({
  tx,
  className = ''
}: {
  tx: MergedTransaction
  className?: string
}) {
  const [blinkNewTx, setBlinkNewTx] = useState(true)
  const { open: openTxDetails } = useTxDetailsStore()

  const { highlightedTx, resetHighlightedTx } =
    useHighlightedTransactionsStore()
  const shouldHighlightTx =
    highlightedTx.txId === tx.txId &&
    highlightedTx.parentChainId === tx.parentChainId &&
    highlightedTx.childChainId === tx.childChainId

  const sourceChainId = tx.isWithdrawal ? tx.childChainId : tx.parentChainId
  const destChainId = tx.isWithdrawal ? tx.parentChainId : tx.childChainId

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

  useEffect(() => {
    // stop the blinking effect of the new transactions
    const timeout = setTimeout(() => {
      setBlinkNewTx(false)
      // this value matches 3 iterations of animate-pulse
    }, 6_100)

    return () => clearTimeout(timeout)
  }, [])

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

  const StatusLabel = useCallback(() => {
    if (isTxFailed(tx)) {
      return (
        <div className="flex items-center space-x-1 text-red-400">
          <XCircleIcon height={14} className="mr-1" />
          <span>Failed</span>
          <ExternalLink href={`${getExplorerUrl(sourceChainId)}/tx/${tx.txId}`}>
            <ArrowTopRightOnSquareIcon height={10} />
          </ExternalLink>
        </div>
      )
    }

    if (isTxExpired(tx)) {
      return (
        <div className="flex items-center space-x-1 text-red-400">
          <XCircleIcon height={14} className="mr-1" />
          <span>Expired</span>
          <ExternalLink href={`${getExplorerUrl(sourceChainId)}/tx/${tx.txId}`}>
            <ArrowTopRightOnSquareIcon height={10} />
          </ExternalLink>
        </div>
      )
    }

    if (isTxPending(tx)) {
      return (
        <div className="flex items-center space-x-1 text-yellow-400">
          <div className="mr-1 h-[10px] w-[10px] rounded-full border border-yellow-400" />
          <span>Pending</span>
          <ExternalLink href={`${getExplorerUrl(sourceChainId)}/tx/${tx.txId}`}>
            <ArrowTopRightOnSquareIcon height={10} />
          </ExternalLink>
        </div>
      )
    }

    if (isTxClaimable(tx)) {
      return (
        <div className="flex items-center space-x-1 text-green-400">
          <div className="mr-1 h-[10px] w-[10px] rounded-full border border-green-400" />
          <span>Claimable</span>
          <ExternalLink href={`${getExplorerUrl(sourceChainId)}/tx/${tx.txId}`}>
            <ArrowTopRightOnSquareIcon height={10} />
          </ExternalLink>
        </div>
      )
    }

    const destinationNetworkTxId = getDestinationNetworkTxId(tx)

    // Success
    return (
      <div className="flex items-center space-x-1">
        <CheckCircleIcon height={14} className="mr-1" />
        <span>Success</span>
        {destinationNetworkTxId && (
          <ExternalLink
            href={`${getExplorerUrl(destChainId)}/tx/${destinationNetworkTxId}`}
          >
            <ArrowTopRightOnSquareIcon height={10} />
          </ExternalLink>
        )}
      </div>
    )
  }, [tx, sourceChainId, destChainId])

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

  const removeRowHighlight = useCallback(() => {
    if (shouldHighlightTx) {
      resetHighlightedTx()
    }
  }, [shouldHighlightTx, resetHighlightedTx])

  return (
    <div
      data-testid={`${isClaimableTx ? 'claimable' : 'deposit'}-row-${tx.txId}`}
      className={twMerge(
        'relative mx-4 grid h-[60px] grid-cols-[140px_140px_140px_140px_100px_180px_140px] items-center justify-between border-b border-white/30 text-xs text-white',
        className,
        shouldHighlightTx && blinkNewTx && 'animate-pulse'
      )}
      style={
        shouldHighlightTx
          ? {
              background:
                // new transactions get highlighted for a brief amount of time with this gradient
                'linear-gradient(to right, rgba(255, 255, 255, 0), rgba(255, 255, 255, 0.2) 25%, rgba(255, 255, 255, 0.2) 75%, rgba(255, 255, 255, 0))'
            }
          : {}
      }
      onClick={removeRowHighlight}
      onMouseOver={removeRowHighlight}
    >
      <div className="pr-3 align-middle">{txRelativeTime}</div>
      <div className="flex items-center pr-3 align-middle">
        <TransactionsTableTokenImage tx={tx} />
        <span className="ml-2">
          {formatAmount(Number(tx.value), {
            symbol: tokenSymbol
          })}
        </span>
      </div>
      <div className="flex items-center space-x-2">
        <span>
          <NetworkImage
            chainId={tx.isWithdrawal ? tx.childChainId : tx.parentChainId}
          />
        </span>
        <span className="inline-block w-[55px] break-words">
          {getNetworkName(tx.isWithdrawal ? tx.childChainId : tx.parentChainId)}
        </span>
      </div>
      <div className="flex items-center space-x-2">
        <span>
          <NetworkImage
            chainId={tx.isWithdrawal ? tx.parentChainId : tx.childChainId}
          />
        </span>
        <span className="inline-block w-[55px] break-words">
          {getNetworkName(tx.isWithdrawal ? tx.parentChainId : tx.childChainId)}
        </span>
      </div>
      <div className="pr-3 align-middle">
        <StatusLabel />
      </div>
      <div className="flex justify-center px-3 align-middle">
        <TransactionsTableRowAction
          tx={tx}
          isError={isError}
          type={tx.isWithdrawal ? 'withdrawals' : 'deposits'}
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
