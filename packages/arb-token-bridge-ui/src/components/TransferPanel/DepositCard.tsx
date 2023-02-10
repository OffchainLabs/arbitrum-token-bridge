import React, { useMemo } from 'react'

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
import { ChainId, getExplorerUrl, getNetworkLogo } from '../../util/networks'

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
          href={`${getExplorerUrl(l1.network.chainID)}/tx/${tx.txId}`}
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
          href={`${getExplorerUrl(l2.network.chainID)}/tx/${
            tx.l1ToL2MsgData?.l2TxID
          }`}
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
  children: React.ReactNode
}

export function DepositCardContainer({
  tx,
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

  return (
    <div
      className={`box-border w-full overflow-hidden rounded-xl border-4 border-blue-link p-4 ${bgClassName}`}
    >
      <div className="relative flex flex-col items-center gap-6 lg:flex-row">
        {/* Logo watermark */}
        <img
          src={getNetworkLogo(ChainId.ArbitrumOne)}
          className="absolute left-0 top-1 z-10 h-6 max-h-[90px] lg:relative lg:top-0 lg:h-full lg:opacity-[40%]"
          alt="Deposit"
        />
        {/* Actual content */}
        <div className="z-20 w-full">{children}</div>
      </div>

      {!isTransferPanelVisible && (
        <button
          className="arb-hover absolute bottom-4 right-4 text-blue-link underline"
          onClick={() => {
            trackEvent('Move More Funds Click')
            dispatch({
              type: 'layout.set_txhistory_panel_visible',
              payload: false
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
