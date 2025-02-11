import { useMemo } from 'react'
import { twMerge } from 'tailwind-merge'
import {
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import { TeleporterMergedTransaction } from '../../state/app/state'
import { getExplorerUrl, getNetworkName, isNetwork } from '../../util/networks'
import {
  firstRetryableLegRequiresRedeem,
  getChainIdForRedeemingRetryable,
  l1L2RetryableRequiresRedeem,
  l2ForwarderRetryableRequiresRedeem,
  secondRetryableLegForTeleportRequiresRedeem
} from '../../util/RetryableUtils'
import { TransactionsTableRowAction } from './TransactionsTableRowAction'
import { ExternalLink } from '../common/ExternalLink'
import {
  Step,
  TransactionFailedOnNetwork
} from './TransactionsTableDetailsSteps'
import { TransferCountdown } from '../common/TransferCountdown'
import {
  getOrbitDepositDuration,
  getStandardDepositDuration,
  minutesToHumanReadableTime
} from '../../hooks/useTransferDuration'

const TeleportMiddleStepFailureExplanationNote = ({
  tx
}: {
  tx: TeleporterMergedTransaction
}) => {
  return (
    <div className="mt-2">
      <div
        className={twMerge(
          'flex items-center gap-2',
          l1L2RetryableRequiresRedeem(tx) && 'text-white/60'
        )}
      >
        {!l1L2RetryableRequiresRedeem(tx) ? (
          <CheckCircleIcon
            height={15}
            className="h-[15px] w-[15px] shrink-0 text-green-400"
          />
        ) : (
          <div className="m-[1px] h-[13px] w-[13px] shrink-0 rounded-full border border-white/60" />
        )}
        Funds deposited to {getNetworkName(getChainIdForRedeemingRetryable(tx))}
        .{' '}
      </div>
      <div
        className={twMerge(
          'mt-1 flex items-center gap-2',
          l2ForwarderRetryableRequiresRedeem(tx) && 'text-white/60'
        )}
      >
        {!l2ForwarderRetryableRequiresRedeem(tx) ? (
          <CheckCircleIcon
            height={15}
            className="h-[15px] w-[15px] shrink-0 text-green-400"
          />
        ) : (
          <div className="m-[1px] h-[13px] w-[13px] shrink-0 rounded-full border border-white/60" />
        )}
        Funds sent to {getNetworkName(tx.destinationChainId)}.
      </div>
    </div>
  )
}

export const TransactionsTableDetailsTeleporterSteps = ({
  tx
}: {
  tx: TeleporterMergedTransaction
}) => {
  const l2TxID = tx.parentToChildMsgData?.childTxId
  const isFirstRetryableLegSucceeded =
    typeof l2TxID !== 'undefined' &&
    typeof tx.l2ToL3MsgData?.l2ForwarderRetryableTxID === 'undefined'
  const l2ChainId = tx.l2ToL3MsgData?.l2ChainId
  const isFirstRetryableLegFailed = firstRetryableLegRequiresRedeem(tx)
  const l2ForwarderRequiresRedeem = l2ForwarderRetryableRequiresRedeem(tx)

  const { isTestnet } = isNetwork(tx.sourceChainId)

  const isFirstRetryableLegResolved =
    isFirstRetryableLegSucceeded || isFirstRetryableLegFailed

  const isSecondRetryableLegResolved =
    secondRetryableLegForTeleportRequiresRedeem(tx) ||
    typeof tx.l2ToL3MsgData?.l3TxID !== 'undefined'

  const firstRetryableRedeemButton = useMemo(
    () => <TransactionsTableRowAction type="deposits" isError={true} tx={tx} />,
    [tx]
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

  const firstTransactionActionItem = isFirstRetryableLegFailed
    ? firstRetryableRedeemButton
    : firstTransactionExternalLink

  const firstRetryableWaitingDuration = getStandardDepositDuration(isTestnet)
  const secondRetryableWaitingDuration = getOrbitDepositDuration(isTestnet)

  return (
    <>
      {/* show waiting time for first leg of teleporter tx */}
      <Step
        pending={!isFirstRetryableLegResolved}
        done={isFirstRetryableLegResolved}
        text={`Wait ~${minutesToHumanReadableTime(
          firstRetryableWaitingDuration
        )}`}
        endItem={
          !isFirstRetryableLegResolved && (
            <TransferCountdown
              tx={tx}
              firstLegOnly={true}
              textAfterTime="remaining"
            />
          )
        }
      />

      {/* show mid transaction step for teleport tx */}
      <Step
        done={isFirstRetryableLegSucceeded}
        failure={isFirstRetryableLegFailed}
        text={
          <FirstRetryableLegLabel
            tx={tx}
            isFirstRetryableLegFailed={isFirstRetryableLegFailed}
            l2ForwarderRequiresRedeem={l2ForwarderRequiresRedeem}
            l2ChainId={l2ChainId}
          />
        }
        endItem={firstTransactionActionItem}
        extendHeight={l2ForwarderRequiresRedeem} // when we show the explanatory note, we need more height for this step
      />

      {/* Show second leg of teleport transfer waiting time */}
      <Step
        pending={isFirstRetryableLegSucceeded && !isSecondRetryableLegResolved}
        done={isSecondRetryableLegResolved}
        text={`Wait ~${minutesToHumanReadableTime(
          secondRetryableWaitingDuration
        )}`}
      />
    </>
  )
}

const FirstRetryableLegLabel = ({
  tx,
  isFirstRetryableLegFailed,
  l2ForwarderRequiresRedeem,
  l2ChainId
}: {
  tx: TeleporterMergedTransaction
  isFirstRetryableLegFailed: boolean
  l2ForwarderRequiresRedeem: boolean
  l2ChainId?: number
}) => {
  if (isFirstRetryableLegFailed) {
    const l2NetworkName = getNetworkName(getChainIdForRedeemingRetryable(tx))

    return (
      <div>
        <TransactionFailedOnNetwork networkName={l2NetworkName} />

        {/* if we detect we will have 2 redemptions in the first leg of teleport, explain it to users */}
        {l2ForwarderRequiresRedeem && (
          <TeleportMiddleStepFailureExplanationNote tx={tx} />
        )}
      </div>
    )
  }

  if (l2ChainId) {
    return `Funds arrived on ${getNetworkName(l2ChainId)}`
  }

  // till the time we don't have information for l2ChainId
  return `Funds arrived on intermediate chain`
}
