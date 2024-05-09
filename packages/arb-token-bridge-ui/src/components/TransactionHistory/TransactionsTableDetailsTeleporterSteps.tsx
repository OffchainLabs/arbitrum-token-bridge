import { useMemo } from 'react'
import { Address } from 'wagmi'
import { twMerge } from 'tailwind-merge'
import { MergedTransaction } from '../../state/app/state'
import { getExplorerUrl, getNetworkName, isNetwork } from '../../util/networks'
import {
  firstRetryableLegRequiresRedeem,
  getChainIdForRedeemingRetryable,
  l1L2RetryableRequiresRedeem,
  l2ForwarderRetryableRequiresRedeem,
  l2L3RetryableRequiresRedeem
} from '../../util/RetryableUtils'
import { TransactionsTableRowAction } from './TransactionsTableRowAction'
import { ExternalLink } from '../common/ExternalLink'
import {
  ArrowTopRightOnSquareIcon,
  CheckIcon
} from '@heroicons/react/24/outline'
import { Step } from './TransactionsTableDetailsSteps'
import { DepositCountdown } from '../common/DepositCountdown'

const TeleportMiddleStepFailureExplanationNote = ({
  tx
}: {
  tx: MergedTransaction
}) => {
  return (
    <div className="mt-1 text-white/60">
      Note: Retrying may trigger 2 transactions to sign -
      <div className="flex items-center">
        1. To complete the deposit to{' '}
        {getNetworkName(getChainIdForRedeemingRetryable(tx))}.{' '}
        {!l1L2RetryableRequiresRedeem(tx) && (
          <CheckIcon height={12} className="m-1 text-green-400" />
        )}
      </div>
      <div className="flex items-center">
        2. To relay the deposit to {getNetworkName(tx.destinationChainId)}.
        {!l2ForwarderRetryableRequiresRedeem(tx) && (
          <CheckIcon height={12} className="m-1 text-green-400" />
        )}
      </div>
    </div>
  )
}

export const TransactionsTableDetailsTeleporterSteps = ({
  tx,
  address
}: {
  tx: MergedTransaction
  address: Address | undefined
}) => {
  const { isTestnet: isTestnetTx } = isNetwork(tx.childChainId)

  const l2TxID = tx.l1ToL2MsgData?.l2TxID
  const isFirstRetryableSucceeded =
    typeof l2TxID !== 'undefined' &&
    typeof tx.l2ToL3MsgData?.l2ForwarderRetryableTxID === 'undefined'
  const l2ChainId = tx.l2ToL3MsgData?.l2ChainId
  const isFirstRetryableFailed = firstRetryableLegRequiresRedeem(tx)
  const _l2ForwarderRequiresRedeem = l2ForwarderRetryableRequiresRedeem(tx)

  const isFirstRetryableResolved =
    isFirstRetryableSucceeded || isFirstRetryableFailed

  const secondRetryableResolved =
    l2L3RetryableRequiresRedeem(tx) ||
    typeof tx.l2ToL3MsgData?.l3TxID !== 'undefined'

  const firstTransactionText = useMemo(() => {
    if (isFirstRetryableFailed) {
      const l2NetworkName = getNetworkName(getChainIdForRedeemingRetryable(tx))

      return (
        <div>
          Transaction failed on {l2NetworkName}. You have 7 days to retry. After
          that, the tx is no longer recoverable.
          {/* if we detect we will have 2 redemptions in the first leg of teleport, explain it to users */}
          {_l2ForwarderRequiresRedeem && (
            <TeleportMiddleStepFailureExplanationNote tx={tx} />
          )}
        </div>
      )
    }

    // if l2ChainId is present
    if (l2ChainId) {
      return `Funds arrived on ${getNetworkName(l2ChainId)}`
    }

    // till the time we don't have information for l2ChainId
    return `Funds arrived on intermediate chain`
  }, [tx, isFirstRetryableFailed, l2ChainId, _l2ForwarderRequiresRedeem])

  const firstRetryableRedeemButton = useMemo(
    () => (
      <TransactionsTableRowAction
        type="deposits"
        isError={true}
        tx={tx}
        address={address}
      />
    ),
    [tx, address]
  )

  const firstTransactionExternalLink = useMemo(
    () =>
      l2TxID &&
      l2ChainId && (
        <ExternalLink href={`${getExplorerUrl(l2ChainId)}/tx/${l2TxID}`}>
          <ArrowTopRightOnSquareIcon height={12} />
        </ExternalLink>
      ),
    [l2TxID, l2ChainId]
  )

  const firstTransactionActionItem = isFirstRetryableFailed
    ? firstRetryableRedeemButton
    : firstTransactionExternalLink

  const firstRetryableWaitingDuration = useMemo(
    () => (isTestnetTx ? '10 minutes' : '15 minutes'),
    [isTestnetTx]
  )

  const secondRetryableWaitingDuration = useMemo(
    () => (isTestnetTx ? '1 minute' : '5 minutes'),
    [isTestnetTx]
  )

  return (
    <>
      {/* show waiting time for first leg of teleporter tx */}
      <Step
        pending={!isFirstRetryableResolved}
        done={isFirstRetryableResolved}
        text={`Wait ~${firstRetryableWaitingDuration}`}
        endItem={
          !isFirstRetryableResolved && (
            <div>
              <DepositCountdown tx={tx} firstTxOnly={true} />
              <span> remaining</span>
            </div>
          )
        }
      />

      {/* show mid transaction step for teleport tx */}
      <Step
        done={isFirstRetryableSucceeded}
        failure={isFirstRetryableFailed}
        text={firstTransactionText}
        endItem={firstTransactionActionItem}
        classNameOverrides={twMerge(
          _l2ForwarderRequiresRedeem ? 'h-auto items-start' : '' // when we show the explanatory note, we need more height for this step
        )}
      />

      {/* Show second leg of teleport transfer waiting time */}
      <Step
        pending={isFirstRetryableSucceeded && !secondRetryableResolved}
        done={secondRetryableResolved}
        text={`Wait ~${secondRetryableWaitingDuration}`}
      />
    </>
  )
}
