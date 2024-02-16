/*
  A small info banner that we show when the user has some pending claim withdrawals OR some retryables to redeem.
  Format: "You have [X] deposits to retry and [Y] withdrawals ready to claim. [CTA]"
*/

import { useAccount } from 'wagmi'
import { useCallback, useMemo } from 'react'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { twMerge } from 'tailwind-merge'
import Image from 'next/image'
import ArrowsIcon from '@/images/arrows.svg'

import { isDepositReadyToRedeem } from '../../state/app/utils'
import { useAppContextActions } from '../App/AppContext'
import { useTransactionHistory } from '../../hooks/useTransactionHistory'
import { Button } from '../common/Button'
import { isTxClaimable, isTxPending } from './helpers'
import { Transition } from '../common/Transition'
import { pluralizeWord } from '../../util/CommonUtils'

export const TransactionStatusInfo = () => {
  const { address } = useAccount()
  const { openTransactionHistoryPanel } = useAppContextActions()
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

  const shouldShow = useMemo(() => {
    return (
      numClaimableTransactions > 0 ||
      numRetryablesToRedeem > 0 ||
      numPendingTransactions > 0
    )
  }, [numClaimableTransactions, numRetryablesToRedeem, numPendingTransactions])

  const Content = useCallback(() => {
    const numClaimableTransactionsString = `claim ${numClaimableTransactions} ${pluralizeWord(
      { word: 'transaction', shouldPluralize: numClaimableTransactions > 1 }
    )}`
    const numRetryablesToRedeemString = `retry ${numRetryablesToRedeem} ${pluralizeWord(
      { word: 'transaction', shouldPluralize: numRetryablesToRedeem > 1 }
    )}`
    const numPendingTransactionsString = `${numPendingTransactions} pending ${pluralizeWord(
      { word: 'transaction', shouldPluralize: numPendingTransactions > 1 }
    )}`

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
  }, [numClaimableTransactions, numRetryablesToRedeem, numPendingTransactions])

  const buttonBgClassName = useMemo(() => {
    if (numRetryablesToRedeem > 0) {
      return 'bg-red-700'
    }
    if (numClaimableTransactions > 0) {
      return 'bg-lime-dark'
    }
    if (numPendingTransactions > 0) {
      return 'bg-cyan-dark'
    }
    return undefined
  }, [numClaimableTransactions, numPendingTransactions, numRetryablesToRedeem])

  return (
    <Transition isOpen={shouldShow} options={{ enterSpeed: 'normal' }}>
      {shouldShow && (
        <Button
          className={twMerge(
            'mt-3 w-full rounded-none border-y border-white/30 p-3 text-left sm:mt-0 sm:rounded sm:border',
            buttonBgClassName
          )}
          onClick={openTransactionHistoryPanel}
          textLeft
          showArrow
          truncate={false}
          variant="primary"
        >
          <Content />
        </Button>
      )}
    </Transition>
  )
}
