import React, { useMemo } from 'react'

import { ExternalLink } from '../common/ExternalLink'
import { MergedTransaction } from '../../state/app/state'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { shortenTxHash } from '../../util/CommonUtils'
import { trackEvent } from '../../util/AnalyticsUtils'

import { WithdrawalCardConfirmed } from './WithdrawalCardConfirmed'
import { WithdrawalCardUnconfirmed } from './WithdrawalCardUnconfirmed'
import { WithdrawalCardExecuted } from './WithdrawalCardExecuted'
import { useAppContextActions, useAppContextState } from '../App/AppContext'
import { ChainId, getExplorerUrl, getNetworkLogo } from '../../util/networks'
import { CheckCircleIcon } from '@heroicons/react/outline'
import { findMatchingL1TxForWithdrawal } from '../../state/app/utils'

export function WithdrawalL2TxStatus({
  tx
}: {
  tx: MergedTransaction
}): JSX.Element {
  const { l2 } = useNetworksAndSigners()
  const { network: l2Network } = l2

  if (typeof l2Network === 'undefined') {
    return <span>Not available</span>
  }

  if (tx.direction === 'withdraw' && tx.status === 'pending') {
    return <span>Pending...</span>
  }

  if (tx.txId === 'l2-tx-hash-not-found') {
    return <span>Not available</span>
  }

  return (
    <ExternalLink
      href={`${getExplorerUrl(l2Network.chainID)}/tx/${tx.txId}`}
      className="arb-hover flex flex-nowrap items-center gap-1 text-blue-link"
    >
      {shortenTxHash(tx.txId)}
      <CheckCircleIcon className="h-4 w-4 text-lime-dark" />
    </ExternalLink>
  )
}

export function WithdrawalL1TxStatus({
  tx
}: {
  tx: MergedTransaction
}): JSX.Element {
  const { l1 } = useNetworksAndSigners()
  const { network: l1Network } = l1

  // Try to find the L1 transaction that matches the L2ToL1 message
  const l1Tx = findMatchingL1TxForWithdrawal(tx)

  if (typeof l1Network === 'undefined') {
    return <span>Not available</span>
  }

  if (typeof l1Tx === 'undefined') {
    return <span>Not available</span>
  }

  return (
    <ExternalLink
      href={`${getExplorerUrl(l1Network.chainID)}/tx/${l1Tx.txId}`}
      className="arb-hover flex flex-nowrap items-center gap-1 text-blue-link"
    >
      {shortenTxHash(l1Tx.txId)}
      <CheckCircleIcon className="h-4 w-4 text-lime-dark" />
    </ExternalLink>
  )
}

export type WithdrawalCardContainerProps = {
  tx: MergedTransaction
  children: React.ReactNode
}

export function WithdrawalCardContainer({
  tx,
  children
}: WithdrawalCardContainerProps) {
  const { closeTransactionHistoryPanel } = useAppContextActions()
  const {
    layout: { isTransferPanelVisible }
  } = useAppContextState()

  const bgClassName = useMemo(() => {
    switch (tx.status) {
      case 'Executed':
        return 'bg-lime'

      default:
        return 'bg-white'
    }
  }, [tx])

  return (
    <div
      className={`box-border w-full overflow-hidden rounded-xl border-4 border-purple-ethereum p-4 ${bgClassName}`}
    >
      <div className="relative flex flex-col items-center gap-6 lg:flex-row">
        {/* Logo watermark */}
        <img
          src={getNetworkLogo(ChainId.Mainnet)}
          className="absolute left-0 top-[1px] z-10 h-6 max-h-[90px] p-[2px] lg:relative lg:left-[-30px] lg:top-0 lg:h-auto lg:max-w-[90px] lg:opacity-[60%]"
          alt="Withdrawal"
        />
        {/* Actual content */}
        <div className="z-20 w-full">{children}</div>
      </div>

      {!isTransferPanelVisible && (
        <button
          className="arb-hover absolute bottom-4 right-4 text-blue-arbitrum underline"
          onClick={() => {
            trackEvent('Move More Funds Click')
            closeTransactionHistoryPanel()
          }}
        >
          Move more funds
        </button>
      )}
    </div>
  )
}

export function WithdrawalCard({ tx }: { tx: MergedTransaction }) {
  if (tx.direction === 'withdraw') {
    return <WithdrawalCardUnconfirmed tx={tx} />
  }

  switch (tx.status) {
    case 'Unconfirmed':
      return <WithdrawalCardUnconfirmed tx={tx} />

    case 'Confirmed':
      return <WithdrawalCardConfirmed tx={tx} />

    case 'Executed':
      return <WithdrawalCardExecuted tx={tx} />

    default:
      return null
  }
}
