import React, { useMemo } from 'react'
import { twMerge } from 'tailwind-merge'

import { ExternalLink } from '../common/ExternalLink'
import { MergedTransaction, DepositStatus } from '../../state/app/state'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { shortenTxHash } from '../../util/CommonUtils'
import { trackEvent } from '../../util/AnalyticsUtils'

import { DepositCardPending } from './DepositCardPending'
import { DepositCardL1Failure } from './DepositCardL1Failure'
import { DepositCardCreationFailure } from './DepositCardCreationFailure'
import { DepositCardL2Failure } from './DepositCardL2Failure'
import { DepositCardSuccess } from './DepositCardSuccess'
import { useAppContextDispatch, useAppContextState } from '../App/AppContext'

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

export type DepositCardContainerProps = {
  tx: MergedTransaction
  dismissable?: boolean
  children: React.ReactNode
}

export function DepositCardContainer({
  tx,
  dismissable = false,
  children
}: DepositCardContainerProps) {
  const dispatch = useAppContextDispatch()
  const {
    layout: { isTransferPanelVisible }
  } = useAppContextState()

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

  const dismissButtonClassName = useMemo(() => {
    switch (tx.depositStatus) {
      case DepositStatus.L1_FAILURE:
      case DepositStatus.CREATION_FAILED:
        return 'text-brick-dark'

      case DepositStatus.L2_SUCCESS:
        return 'text-lime-dark'

      default:
        return ''
    }
  }, [tx])

  function dismiss() {
    dispatch({ type: 'set_tx_as_seen', payload: tx.txId })
  }

  return (
    <div className={`w-full p-6 lg:rounded-xl ${bgClassName}`}>
      {dismissable && (
        <button
          className={twMerge(
            'arb-hover absolute top-4 right-4 underline',
            dismissButtonClassName
          )}
          onClick={dismiss}
        >
          Dismiss
        </button>
      )}

      <div className="flex flex-col space-y-3">{children}</div>

      {!isTransferPanelVisible && !dismissable && (
        <button
          className="arb-hover absolute bottom-4 right-4 text-blue-arbitrum underline"
          onClick={() => {
            trackEvent('Move More Funds Click')
            dispatch({
              type: 'layout.set_is_transfer_panel_visible',
              payload: true
            })
          }}
        >
          Move more funds
        </button>
      )}
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
