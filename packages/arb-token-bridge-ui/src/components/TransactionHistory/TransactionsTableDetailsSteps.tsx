import { ReactNode } from 'react'
import dayjs from 'dayjs'
import { twMerge } from 'tailwind-merge'
import {
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'

import { DepositStatus, MergedTransaction } from '../../state/app/state'
import { getExplorerUrl, getNetworkName, isNetwork } from '../../util/networks'
import {
  getDestinationNetworkTxId,
  isTxClaimable,
  isTxCompleted,
  isTxExpired,
  isTxFailed,
  isTxPending
} from './helpers'
import { TransactionsTableRowAction } from './TransactionsTableRowAction'
import { ExternalLink } from '../common/ExternalLink'
import {
  WithdrawalCountdown,
  getTxConfirmationDate
} from '../common/WithdrawalCountdown'
import { DepositCountdown } from '../common/DepositCountdown'
import { useRemainingTime } from '../../state/cctpState'
import { isDepositReadyToRedeem } from '../../state/app/utils'

function getTransferDurationText(tx: MergedTransaction) {
  const { isTestnet, isOrbitChain } = isNetwork(tx.childChainId)

  if (tx.isCctp) {
    return isTestnet ? 'a minute' : '10 minutes'
  }

  if (!tx.isWithdrawal) {
    if (isOrbitChain) {
      return 'a minute'
    }
    return isTestnet ? '10 minutes' : '15 minutes'
  }

  // withdrawals
  return getTxConfirmationDate({
    createdAt: dayjs(),
    withdrawalFromChainId: tx.childChainId
    // we set from to current time so that we get the full withdrawal confirmation time
  }).from(dayjs(), true)
}

function needsToClaimTransfer(tx: MergedTransaction) {
  return tx.isCctp || tx.isWithdrawal
}

const Step = ({
  done = false,
  claimable = false,
  pending = false,
  failure = false,
  text,
  endItem = null
}: {
  done?: boolean
  claimable?: boolean
  pending?: boolean
  failure?: boolean
  text: string
  endItem?: ReactNode
}) => {
  // defaults to a step that hasn't been started yet
  let borderColorClassName = 'border-white/50'
  let iconColorClassName = 'text-white/50'
  let textColorClassName = 'text-white/50'

  if (done || claimable) {
    borderColorClassName = 'border-green-400'
    iconColorClassName = 'text-green-400'
    textColorClassName = 'text-white'
  }

  if (pending) {
    borderColorClassName = 'border-yellow-400'
    iconColorClassName = 'text-yellow-400'
    textColorClassName = 'text-white'
  }

  if (failure) {
    borderColorClassName = 'border-red-400'
    iconColorClassName = 'text-red-400'
    textColorClassName = 'text-white'
  }

  return (
    <div
      className={twMerge(
        'my-3 flex items-center justify-between',
        pending && 'animate-pulse',
        claimable && 'my-2'
      )}
    >
      <div className="flex items-center space-x-3">
        {done && <CheckCircleIcon className={iconColorClassName} height={18} />}
        {failure && <XCircleIcon className={iconColorClassName} height={18} />}
        {!done && !failure && (
          <div
            className={twMerge(
              'ml-[2px] h-[15px] w-[15px] rounded-full border',
              borderColorClassName
            )}
          />
        )}
        <span className={textColorClassName}>{text}</span>
      </div>
      {endItem}
    </div>
  )
}

export const TransactionsTableDetailsSteps = ({
  tx,
  address
}: {
  tx: MergedTransaction
  address: `0x${string}` | undefined
}) => {
  const { remainingTime: cctpRemainingTime } = useRemainingTime(tx)

  const sourceChainId = tx.isWithdrawal ? tx.childChainId : tx.parentChainId
  const destinationChainId = tx.isWithdrawal
    ? tx.parentChainId
    : tx.childChainId

  const sourceNetworkName = getNetworkName(sourceChainId)
  const destinationNetworkName = getNetworkName(destinationChainId)

  const destinationNetworkTxId = getDestinationNetworkTxId(tx)

  const isSourceChainDepositFailure =
    typeof tx.depositStatus !== 'undefined' &&
    [DepositStatus.CREATION_FAILED, DepositStatus.L1_FAILURE].includes(
      tx.depositStatus
    )

  const isDestinationChainFailure =
    !isSourceChainDepositFailure && isTxFailed(tx)

  return (
    <div className="flex flex-col text-xs">
      {/* First step when transfer is initiated */}
      <Step
        done={!isSourceChainDepositFailure}
        failure={isSourceChainDepositFailure}
        text={
          isSourceChainDepositFailure
            ? `Transaction failed on ${sourceNetworkName}`
            : `Transaction initiated on ${sourceNetworkName}`
        }
        endItem={
          <ExternalLink href={`${getExplorerUrl(sourceChainId)}/tx/${tx.txId}`}>
            <ArrowTopRightOnSquareIcon height={12} />
          </ExternalLink>
        }
      />

      {/* Pending transfer showing the remaining time */}
      <Step
        pending={isTxPending(tx)}
        done={!isTxPending(tx) && !isSourceChainDepositFailure}
        text={`Wait ~${getTransferDurationText(tx)}`}
        endItem={
          isTxPending(tx) && (
            <div>
              {tx.isCctp && <>{cctpRemainingTime}</>}
              {!tx.isCctp &&
                (tx.isWithdrawal ? (
                  <WithdrawalCountdown tx={tx} />
                ) : (
                  <DepositCountdown tx={tx} />
                ))}
              <span> remaining</span>
            </div>
          )
        }
      />

      {/* If claiming is required we show this step */}
      {needsToClaimTransfer(tx) && (
        <Step
          done={isTxCompleted(tx)}
          claimable={isTxClaimable(tx)}
          text={`Claim ${tx.isWithdrawal ? 'withdrawal' : 'deposit'}`}
          endItem={
            isTxClaimable(tx) && (
              <TransactionsTableRowAction
                type={tx.isWithdrawal ? 'withdrawals' : 'deposits'}
                isError={false}
                tx={tx}
                address={address}
              />
            )
          }
        />
      )}

      {/* The final step, showing the destination chain */}
      <Step
        done={isTxCompleted(tx)}
        failure={isTxExpired(tx) || isDestinationChainFailure}
        text={
          isTxExpired(tx) || isDestinationChainFailure
            ? `Transaction ${
                isDestinationChainFailure ? 'failed' : 'expired'
              } on ${destinationNetworkName}`
            : `Funds arrived on ${destinationNetworkName}`
        }
        endItem={
          <>
            {destinationNetworkTxId && (
              <ExternalLink
                href={`${getExplorerUrl(
                  destinationChainId
                )}/tx/${getDestinationNetworkTxId(tx)}`}
              >
                <ArrowTopRightOnSquareIcon height={12} />
              </ExternalLink>
            )}
            {isDepositReadyToRedeem(tx) && (
              <div className="-mt-3">
                <TransactionsTableRowAction
                  type={tx.isWithdrawal ? 'withdrawals' : 'deposits'}
                  isError={true}
                  tx={tx}
                  address={address}
                />
              </div>
            )}
          </>
        }
      />
    </div>
  )
}
