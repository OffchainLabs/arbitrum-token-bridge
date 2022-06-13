import { useMemo } from 'react'
import dayjs from 'dayjs'

import { DepositStatus } from '../../state/app/state'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { MergedTransaction } from '../../state/app/state'
import {
  DepositCardContainer,
  DepositL1TxStatus,
  DepositL2TxStatus
} from './DepositCard'

// TODO: Double-check these values
export function DepositCardCountdown({
  tx
}: {
  tx: MergedTransaction
}): JSX.Element | null {
  const now = dayjs()
  const whenCreated = dayjs(tx?.createdAt)

  if (tx.depositStatus === DepositStatus.L1_PENDING) {
    // We expect the L1 tx to be confirmed within 3 minutes in most cases, so we subtract the diff from 3 minutes.
    const minutesRemaining = 3 - now.diff(whenCreated, 'minutes')

    if (minutesRemaining <= 0) {
      return <span>Almost there...</span>
    }

    return <span>~{minutesRemaining} minutes</span>
  }

  if (tx.depositStatus === DepositStatus.L2_PENDING) {
    // We expect the L2 tx to be confirmed within 10 minutes in most cases, so we subtract the diff from 10 minutes.
    const minutesRemaining = 10 - now.diff(whenCreated, 'minutes')

    if (minutesRemaining <= 1) {
      if (minutesRemaining <= 0) {
        return <span>Almost there...</span>
      }

      return <span>Less than a minute...</span>
    }

    return <span>~{minutesRemaining} minutes</span>
  }

  return null
}

export function DepositCardPending({ tx }: { tx: MergedTransaction }) {
  const { l2 } = useNetworksAndSigners()

  const networkName = useMemo(
    () => (typeof l2.network !== 'undefined' ? l2.network.name : 'Arbitrum'),
    [l2.network]
  )

  return (
    <DepositCardContainer tx={tx}>
      <span className="animate-pulse text-2xl text-v3-arbitrum-dark-blue">
        Moving {tx.value} {tx.asset.toUpperCase()} to {networkName}...
      </span>
      <span className="animate-pulse text-4xl font-semibold text-v3-arbitrum-dark-blue">
        <DepositCardCountdown tx={tx} />
      </span>
      <div className="flex flex-col font-light">
        <span className="text-v3-arbitrum-dark-blue">
          L1 transaction: <DepositL1TxStatus tx={tx} />
        </span>
        <span className="text-v3-arbitrum-dark-blue">
          L2 transaction: <DepositL2TxStatus tx={tx} />
        </span>
      </div>
    </DepositCardContainer>
  )
}
