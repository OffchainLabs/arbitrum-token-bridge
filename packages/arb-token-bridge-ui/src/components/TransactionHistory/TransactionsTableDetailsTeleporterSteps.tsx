import { useMemo } from 'react'
import { Address } from 'wagmi'
import { twMerge } from 'tailwind-merge'
import {
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import { MergedTransaction } from '../../state/app/state'
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
import { Step } from './TransactionsTableDetailsSteps'
import { DepositCountdown } from '../common/DepositCountdown'

const TeleportMiddleStepFailureExplanationNote = ({
  tx
}: {
  tx: MergedTransaction
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
  tx,
  address
}: {
  tx: MergedTransaction
  address: Address | undefined
}) => {
  const { isTestnet: isTestnetTx } = isNetwork(tx.childChainId)

  const l2TxID = tx.l1ToL2MsgData?.l2TxID
  const isFirstRetryableLegSucceeded =
    typeof l2TxID !== 'undefined' &&
    typeof tx.l2ToL3MsgData?.l2ForwarderRetryableTxID === 'undefined'
  const l2ChainId = tx.l2ToL3MsgData?.l2ChainId
  const isFirstRetryableLegFailed = firstRetryableLegRequiresRedeem(tx)
  const l2ForwarderRequiresRedeem = l2ForwarderRetryableRequiresRedeem(tx)

  const isFirstRetryableLegResolved =
    isFirstRetryableLegSucceeded || isFirstRetryableLegFailed

  const isSecondRetryableLegResolved =
    secondRetryableLegForTeleportRequiresRedeem(tx) ||
    typeof tx.l2ToL3MsgData?.l3TxID !== 'undefined'

  const firstTransactionText = useMemo(() => {
    if (isFirstRetryableLegFailed) {
      const l2NetworkName = getNetworkName(getChainIdForRedeemingRetryable(tx))

      return (
        <div>
          Transaction failed on {l2NetworkName}. You have 7 days to try again.
          After that, your funds will be{' '}
          <span className="font-bold text-red-400">lost forever</span>.
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
  }, [tx, isFirstRetryableLegFailed, l2ChainId, l2ForwarderRequiresRedeem])

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

  const firstTransactionActionItem = isFirstRetryableLegFailed
    ? firstRetryableRedeemButton
    : firstTransactionExternalLink

  const firstRetryableWaitingDuration = isTestnetTx
    ? '10 minutes'
    : '15 minutes'

  const secondRetryableWaitingDuration = isTestnetTx ? '1 minute' : '5 minutes'

  return (
    <>
      {/* show waiting time for first leg of teleporter tx */}
      <Step
        pending={!isFirstRetryableLegResolved}
        done={isFirstRetryableLegResolved}
        text={`Wait ~${firstRetryableWaitingDuration}`}
        endItem={
          !isFirstRetryableLegResolved && (
            <div>
              <DepositCountdown tx={tx} firstTxOnly={true} />
              <span> remaining</span>
            </div>
          )
        }
      />

      {/* show mid transaction step for teleport tx */}
      <Step
        done={isFirstRetryableLegSucceeded}
        failure={isFirstRetryableLegFailed}
        text={firstTransactionText}
        endItem={firstTransactionActionItem}
        extendHeight={l2ForwarderRequiresRedeem} // when we show the explanatory note, we need more height for this step
      />

      {/* Show second leg of teleport transfer waiting time */}
      <Step
        pending={isFirstRetryableLegSucceeded && !isSecondRetryableLegResolved}
        done={isSecondRetryableLegResolved}
        text={`Wait ~${secondRetryableWaitingDuration}`}
      />
    </>
  )
}
