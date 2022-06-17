import React, { useMemo } from 'react'

import { ExternalLink } from '../common/ExternalLink'
import { MergedTransaction, DepositStatus } from '../../state/app/state'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { shortenTxHash } from '../../util/CommonUtils'

import { DepositCardPending } from './DepositCardPending'
import { DepositCardL1Failure } from './DepositCardL1Failure'
import { DepositCardCreationFailure } from './DepositCardCreationFailure'
import { DepositCardL2Failure } from './DepositCardL2Failure'
import { DepositCardSuccess } from './DepositCardSuccess'

export function DepositL1TxStatus({
  tx
}: {
  tx: MergedTransaction
}): JSX.Element | null {
  const { l1 } = useNetworksAndSigners()

  switch (tx.depositStatus) {
    case DepositStatus.L1_PENDING:
      return <span>Pending...</span>

    case DepositStatus.L2_PENDING:
    case DepositStatus.L2_SUCCESS:
    case DepositStatus.L2_FAILURE:
    case DepositStatus.CREATION_FAILED:
    case DepositStatus.EXPIRED:
      return (
        <ExternalLink
          href={`${l1.network?.explorerUrl}/tx/${tx.txId}`}
          className="arb-hover text-blue-link"
        >
          {shortenTxHash(tx.txId)}
        </ExternalLink>
      )

    default:
      return null
  }
}

export function DepositL2TxStatus({
  tx
}: {
  tx: MergedTransaction
}): JSX.Element | null {
  const { l2 } = useNetworksAndSigners()

  switch (tx.depositStatus) {
    case DepositStatus.L1_PENDING:
    case DepositStatus.L2_PENDING:
      return <span>Pending...</span>

    case DepositStatus.L2_SUCCESS:
      return (
        <ExternalLink
          href={`${l2.network?.explorerUrl}/tx/${tx.l1ToL2MsgData?.l2TxID}`}
          className="arb-hover text-blue-link"
        >
          {shortenTxHash(tx.l1ToL2MsgData?.l2TxID || '')}
        </ExternalLink>
      )

    default:
      return null
  }
}

export function DepositCardContainer({
  tx,
  children
}: {
  tx: MergedTransaction
  children: React.ReactNode
}) {
  const bgClassName = useMemo(() => {
    switch (tx.depositStatus) {
      case DepositStatus.L1_FAILURE:
      case DepositStatus.CREATION_FAILED:
        return 'bg-brick'

      case DepositStatus.L2_SUCCESS:
        return 'bg-lime'

      case DepositStatus.L2_FAILURE:
        return 'bg-orange'

      default:
        return 'bg-white'
    }
  }, [tx])

  return (
    <div className={`w-full p-8 lg:rounded-xl ${bgClassName}`}>
      <div className="flex flex-col space-y-5">{children}</div>
    </div>
  )
}

export function DepositCard({ tx }: { tx: MergedTransaction }) {
  switch (tx.depositStatus) {
    case DepositStatus.L1_PENDING:
      return <DepositCardPending tx={tx} />

    case DepositStatus.L1_FAILURE:
      return <DepositCardL1Failure tx={tx} />

    case DepositStatus.CREATION_FAILED:
      return <DepositCardCreationFailure tx={tx} />

    case DepositStatus.L2_PENDING:
      return <DepositCardPending tx={tx} />

    case DepositStatus.L2_FAILURE:
      return <DepositCardL2Failure tx={tx} />

    case DepositStatus.L2_SUCCESS:
      return <DepositCardSuccess tx={tx} />

    // Deposits with an expired retryable don't have a card and will show up in the tx history table.
    default:
      return null
  }
}
