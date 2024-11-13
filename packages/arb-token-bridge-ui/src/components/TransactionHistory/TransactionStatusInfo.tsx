/*
  A small info banner that we show when the user has some pending claim withdrawals OR some retryables to redeem.
  Format: "You have [X] deposits to retry and [Y] withdrawals ready to claim. [CTA]"
*/

import { useAccount } from 'wagmi'
import { useMemo } from 'react'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { twMerge } from 'tailwind-merge'
import Image from 'next/image'
import ArrowsIcon from '@/images/arrows.svg'

import { isDepositReadyToRedeem } from '../../state/app/utils'
import { useTransactionHistory } from '../../hooks/useTransactionHistory'
import { isTxClaimable, isTxPending } from './helpers'

const Content = ({
  numClaimableTransactions,
  numRetryablesToRedeem,
  numPendingTransactions
}: {
  numClaimableTransactions: number
  numRetryablesToRedeem: number
  numPendingTransactions: number
}) => {
  const numClaimableTransactionsString = `claim ${numClaimableTransactions} ${
    numClaimableTransactions > 1 ? 'transactions' : 'transaction'
  }`
  const numRetryablesToRedeemString = `retry ${numRetryablesToRedeem} ${
    numRetryablesToRedeem > 1 ? 'transactions' : 'transaction'
  }`
  const numPendingTransactionsString = `${numPendingTransactions} pending ${
    numPendingTransactions > 1 ? 'transactions' : 'transaction'
  }`

  if (numClaimableTransactions > 0 && numRetryablesToRedeem > 0) {
    return (
      <div className="flex space-x-2">
        <ExclamationTriangleIcon width={20} />
        <span>
          Time sensitive: You must{' '}
          <span className="font-bold">{numRetryablesToRedeemString}</span> and{' '}
          <span className="font-bold">{numClaimableTransactionsString}</span>
        </span>
      </div>
    )
  }

  if (numRetryablesToRedeem > 0) {
    return (
      <div className="flex space-x-2">
        <ExclamationTriangleIcon width={20} />
        <span>
          You must{' '}
          <span className="font-bold">{numRetryablesToRedeemString}</span>
        </span>
      </div>
    )
  }

  if (numClaimableTransactions > 0) {
    return (
      <div className="flex space-x-2">
        <ExclamationTriangleIcon width={20} />
        <span>
          You must{' '}
          <span className="font-bold">{numClaimableTransactionsString}</span>
        </span>
      </div>
    )
  }

  if (numPendingTransactions > 0) {
    return (
      <div className="flex space-x-2">
        <Image src={ArrowsIcon} width={20} height={20} alt="Transactions" />
        <span>
          You have{' '}
          <span className="font-bold">{numPendingTransactionsString}</span>
        </span>
      </div>
    )
  }

  return null
}

export const TransactionStatusInfo = () => {
  const { address } = useAccount()
  const { transactions } = useTransactionHistory(address)

  const {
    numClaimableTransactions,
    numRetryablesToRedeem,
    numPendingTransactions
  } = useMemo(() => {
    return transactions.reduce(
      (acc, tx) => {
        // standard bridge withdrawal
        if (isTxClaimable(tx)) {
          acc.numClaimableTransactions += 1
        }
        // failed retryable
        if (isDepositReadyToRedeem(tx)) {
          acc.numRetryablesToRedeem += 1
        }
        // all pending
        if (isTxPending(tx)) {
          acc.numPendingTransactions += 1
        }
        return acc
      },
      {
        numClaimableTransactions: 0,
        numRetryablesToRedeem: 0,
        numPendingTransactions: 0
      }
    )
  }, [transactions])

  const buttonClassName = useMemo(() => {
    if (numRetryablesToRedeem > 0) {
      return 'bg-red-700'
    }
    if (numClaimableTransactions > 0) {
      return 'bg-lime-dark'
    }
    if (numPendingTransactions > 0) {
      return 'bg-cyan-dark'
    }
    return 'bg-gray-1 text-white/70'
  }, [numClaimableTransactions, numPendingTransactions, numRetryablesToRedeem])

  if (Content === null) {
    return null
  }

  return (
    <div
      className={twMerge(
        'mb-3 mt-3 w-full rounded border-x-0 border-white/30 px-3 py-2 text-left text-sm text-white sm:border md:mt-0',
        buttonClassName
      )}
    >
      <Content
        numClaimableTransactions={numClaimableTransactions}
        numRetryablesToRedeem={numRetryablesToRedeem}
        numPendingTransactions={numPendingTransactions}
      />
    </div>
  )
}
