import React, { useMemo } from 'react'
import { BigNumber } from 'ethers'

import { ExternalLink } from '../common/ExternalLink'
import { useAppState } from '../../state'
import { MergedTransaction } from '../../state/app/state'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { shortenTxHash } from '../../util/CommonUtils'
import { trackEvent } from '../../util/AnalyticsUtils'

import { WithdrawalCardConfirmed } from './WithdrawalCardConfirmed'
import { WithdrawalCardUnconfirmed } from './WithdrawalCardUnconfirmed'
import { WithdrawalCardExecuted } from './WithdrawalCardExecuted'
import { useAppContextDispatch, useAppContextState } from '../App/AppContext'

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
      href={`${l2Network.explorerUrl}/tx/${tx.txId}`}
      className="arb-hover text-blue-link"
    >
      {shortenTxHash(tx.txId)}
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
  const {
    app: { mergedTransactions }
  } = useAppState()

  // Try to find the L1 transaction that matches the L2ToL1 message
  const l1Tx = mergedTransactions.find(_tx => {
    let l2ToL1MsgData = _tx.l2ToL1MsgData

    if (typeof l2ToL1MsgData === 'undefined') {
      return false
    }

    // To get rid of Proxy
    const txUniqueId = BigNumber.from(tx.uniqueId)
    const _txUniqueId = BigNumber.from(l2ToL1MsgData.uniqueId)

    return txUniqueId.toString() === _txUniqueId.toString()
  })

  if (typeof l1Network === 'undefined') {
    return <span>Not available</span>
  }

  if (typeof l1Tx === 'undefined') {
    return <span>Not available</span>
  }

  return (
    <ExternalLink
      href={`${l1Network.explorerUrl}/tx/${l1Tx.txId}`}
      className="arb-hover text-blue-link"
    >
      {shortenTxHash(l1Tx.txId)}
    </ExternalLink>
  )
}

export function WithdrawalCardContainer({
  tx,
  children
}: {
  tx: MergedTransaction
  children: React.ReactNode
}) {
  const dispatch = useAppContextDispatch()
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
    <div className={`w-full p-6 lg:rounded-xl ${bgClassName}`}>
      <div className="flex flex-col space-y-3">{children}</div>
      <div className="flex justify-end">
        {!isTransferPanelVisible && (
          <button
            className="arb-hover font-light text-blue-arbitrum underline"
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
