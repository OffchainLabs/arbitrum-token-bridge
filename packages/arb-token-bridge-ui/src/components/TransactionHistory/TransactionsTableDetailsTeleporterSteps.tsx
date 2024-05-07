import { useMemo } from 'react'
import { Address } from 'wagmi'
import { MergedTransaction } from '../../state/app/state'
import { isRetryableTicketFailed } from '../../state/app/utils'
import { getExplorerUrl, getNetworkName, isNetwork } from '../../util/networks'
import { getChainIdForRedeemingRetryable } from '../../util/RetryableUtils'
import { TransactionsTableRowAction } from './TransactionsTableRowAction'
import { ExternalLink } from '../common/ExternalLink'
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline'
import { Step } from './TransactionsTableDetailsSteps'

export const TransactionsTableDetailsTeleporterSteps = ({
  tx,
  address
}: {
  tx: MergedTransaction
  address: Address | undefined
}) => {
  const { isTestnet: isTestnetTx } = isNetwork(tx.childChainId)

  const l2TxID = tx.l1ToL2MsgData?.l2TxID
  const isFirstRetryableSucceeded = !!l2TxID // if l2-txId is present, then first retryable succeeded
  const l2ChainId = tx.l2ToL3MsgData?.l2ChainId
  const firstRetryableStatus = tx.l1ToL2MsgData?.status
  const isFirstRetryableFailed =
    firstRetryableStatus && isRetryableTicketFailed(firstRetryableStatus)
  const secondRetryableCreated = !!tx.l2ToL3MsgData?.retryableCreationTxID
  const isFirstRetryableWaitingTimeOver =
    isFirstRetryableSucceeded || isFirstRetryableFailed

  const firstTransactionText = useMemo(() => {
    if (isFirstRetryableFailed) {
      const l2NetworkName = getNetworkName(getChainIdForRedeemingRetryable(tx))
      return `Transaction failed on ${l2NetworkName}. You have 7 days to re-execute a failed tx. After that, the tx is no longer recoverable.`
    }

    // if l2ChainId is present
    if (l2ChainId) {
      return `Funds arrived on ${getNetworkName(l2ChainId)}`
    }

    // till the time we don't have information for l2ChainId
    return `Funds arrived on intermediate chain`
  }, [tx, isFirstRetryableFailed, l2ChainId])

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
        pending={!isFirstRetryableWaitingTimeOver}
        done={isFirstRetryableWaitingTimeOver}
        text={`Wait ~${firstRetryableWaitingDuration}`}
        endItem={
          !isFirstRetryableWaitingTimeOver && (
            <div>
              {firstRetryableWaitingDuration}
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
      />

      {/* Show second leg of teleport transfer waiting time */}
      <Step
        done={secondRetryableCreated}
        text={`Wait ~${secondRetryableWaitingDuration}`}
      />
    </>
  )
}
