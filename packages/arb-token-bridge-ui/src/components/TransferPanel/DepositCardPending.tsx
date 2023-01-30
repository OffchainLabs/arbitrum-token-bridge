import { getNetworkName } from '../../util/networks'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { MergedTransaction } from '../../state/app/state'
import { DepositCountdown } from '../common/DepositCountdown'
import {
  DepositCardContainer,
  DepositL1TxStatus,
  DepositL2TxStatus
} from './DepositCard'

export function DepositCardPending({ tx }: { tx: MergedTransaction }) {
  const { l2 } = useNetworksAndSigners()
  const networkName = getNetworkName(l2.network.chainID)

  return (
    <DepositCardContainer tx={tx}>
      <div className="flex flex-row flex-wrap items-center justify-between">
        <div>
          {/* Heading */}
          <span className="animate-pulse text-2xl text-blue-arbitrum">
            Moving {tx.value} {tx.asset.toUpperCase()} to {networkName}
          </span>

          {/* Addresses */}
          <div className="h-2" />
          <div className="flex flex-col font-light">
            <span className="text-lg text-blue-arbitrum">
              L1 transaction: <DepositL1TxStatus tx={tx} />
            </span>
            <span className="text-lg text-blue-arbitrum">
              L2 transaction: <DepositL2TxStatus tx={tx} />
            </span>
          </div>
        </div>

        <span className="my-4 animate-pulse rounded-full bg-orange p-2 text-lg font-semibold text-blue-arbitrum">
          <DepositCountdown
            createdAt={tx.createdAt}
            depositStatus={tx.depositStatus}
          />
        </span>
      </div>
    </DepositCardContainer>
  )
}
