import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { MergedTransaction } from '../../state/app/state'
import { useAppContextState } from '../App/AppContext'
import { WithdrawalCardContainer, WithdrawalL2TxStatus } from './WithdrawalCard'

function WithdrawalCountdown({ tx }: { tx: MergedTransaction }): JSX.Element {
  const {
    l1: { network: l1Network },
    l2: { network: l2Network }
  } = useNetworksAndSigners()
  const { currentL1BlockNumber } = useAppContextState()

  const { nodeBlockDeadline } = tx
  const blockTime = l1Network?.blockTime || 15

  if (
    typeof nodeBlockDeadline === 'undefined' ||
    typeof l2Network === 'undefined'
  ) {
    return <span>'Calculating...'</span>
  }

  if (nodeBlockDeadline === 'NODE_NOT_CREATED') {
    return <span>{l2Network.chainID === 42161 ? '~ 1 week' : '~1 day'}</span>
  }

  // Buffer for after a node is confirmable but isn't yet confirmed; we give ~30 minutes, should be usually/always be less in practice
  const confirmationBufferBlocks = 120
  const blocksRemaining = Math.max(
    nodeBlockDeadline + confirmationBufferBlocks - currentL1BlockNumber,
    0
  )

  const minutesLeft = Math.round((blocksRemaining * blockTime) / 60)
  const hoursLeft = Math.round(minutesLeft / 60)
  const daysLeft = Math.round(hoursLeft / 24)

  if (daysLeft > 0) {
    return (
      <span>{`~${blocksRemaining} blocks (~${daysLeft} day${
        daysLeft === 1 ? '' : 's'
      })`}</span>
    )
  }

  if (hoursLeft > 0) {
    return (
      <span>{`~${blocksRemaining} blocks (~${hoursLeft} hour${
        hoursLeft === 1 ? '' : 's'
      })`}</span>
    )
  }

  if (minutesLeft === 0) {
    return <span>About an hour</span>
  }

  return (
    <span>{`~${blocksRemaining} blocks (~${minutesLeft} minute${
      minutesLeft === 1 ? '' : 's'
    })`}</span>
  )
}

export function WithdrawalCardUnconfirmed({ tx }: { tx: MergedTransaction }) {
  const { l1 } = useNetworksAndSigners()

  return (
    <WithdrawalCardContainer tx={tx}>
      <span className="animate-pulse text-2xl text-v3-arbitrum-dark-blue">
        Moving {tx.value} {tx.asset.toUpperCase()} to {l1.network?.name}...
      </span>

      <span className="animate-pulse text-4xl font-semibold text-v3-arbitrum-dark-blue">
        <WithdrawalCountdown tx={tx} />
      </span>

      <div className="flex flex-col font-light">
        <span className="text-v3-arbitrum-dark-blue">
          L2 transaction: <WithdrawalL2TxStatus tx={tx} />
        </span>
        <span className="text-v3-arbitrum-dark-blue">
          L1 transaction: Will show after claiming
        </span>
      </div>
    </WithdrawalCardContainer>
  )
}
