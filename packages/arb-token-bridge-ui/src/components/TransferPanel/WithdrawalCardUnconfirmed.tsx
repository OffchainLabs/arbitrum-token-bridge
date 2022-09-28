import { getNetworkName } from '../../util/networks'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { MergedTransaction } from '../../state/app/state'
import { WithdrawalCountdown } from '../common/WithdrawalCountdown'
import { WithdrawalCardContainer, WithdrawalL2TxStatus } from './WithdrawalCard'
import { Button } from '../common/Button'
import { Tooltip } from '../common/Tooltip'

export function WithdrawalCardUnconfirmed({ tx }: { tx: MergedTransaction }) {
  const { l1 } = useNetworksAndSigners()
  const networkName = getNetworkName(l1.network)

  return (
    <WithdrawalCardContainer tx={tx}>
      <span className="animate-pulse text-2xl text-blue-arbitrum">
        {`Moving ${tx.value} ${tx.asset.toUpperCase()} to ${networkName}...`}
      </span>

      <span className="animate-pulse text-4xl font-semibold text-blue-arbitrum">
        {tx.nodeBlockDeadline ? (
          <WithdrawalCountdown nodeBlockDeadline={tx.nodeBlockDeadline} />
        ) : (
          <span>Calculating...</span>
        )}
      </span>

      <Tooltip content={<span>Funds aren’t ready to claim yet.</span>}>
        <Button variant="primary" className="text-2xl" disabled>
          Claim {tx.value} {tx.asset.toUpperCase()}
        </Button>
      </Tooltip>

      <div className="h-2" />
      <div className="flex flex-col font-light">
        <span className="text-lg text-blue-arbitrum">
          L2 transaction: <WithdrawalL2TxStatus tx={tx} />
        </span>
        <span className="text-lg text-blue-arbitrum">
          L1 transaction: Will show after claiming
        </span>
      </div>
    </WithdrawalCardContainer>
  )
}
