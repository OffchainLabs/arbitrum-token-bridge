import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { MergedTransaction } from '../../state/app/state'
import { WithdrawalCountdown } from '../common/WithdrawalCountdown'
import { WithdrawalCardContainer, WithdrawalL2TxStatus } from './WithdrawalCard'

export function WithdrawalCardUnconfirmed({ tx }: { tx: MergedTransaction }) {
  const { l1 } = useNetworksAndSigners()

  return (
    <WithdrawalCardContainer tx={tx}>
      <span className="animate-pulse text-2xl text-v3-arbitrum-dark-blue">
        Moving {tx.value} {tx.asset.toUpperCase()} to {l1.network?.name}...
      </span>

      <span className="animate-pulse text-4xl font-semibold text-v3-arbitrum-dark-blue">
        {tx.nodeBlockDeadline && (
          <WithdrawalCountdown nodeBlockDeadline={tx.nodeBlockDeadline} />
        )}
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
