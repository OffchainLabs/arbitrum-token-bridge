import { getNetworkName } from '../../util/networks'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { MergedTransaction } from '../../state/app/state'
import { DepositCountdown } from '../common/DepositCountdown'
import {
  DepositCardContainer,
  DepositL1TxStatus,
  DepositL2TxStatus
} from './DepositCard'
import { formatAmount } from '../../util/NumberUtils'

export function DepositCardPending({ tx }: { tx: MergedTransaction }) {
  const { l2 } = useNetworksAndSigners()
  const networkName = getNetworkName(l2.network.chainID)

  return (
    <DepositCardContainer tx={tx}>
      <div className="flex flex-row flex-wrap items-center justify-between">
        <div className="lg:-ml-8">
          {/* Heading */}
          <span className="ml-8 animate-pulse text-lg text-blue-arbitrum lg:ml-0 lg:text-2xl">
            Moving{' '}
            {formatAmount(Number(tx.value), { symbol: tx.asset.toUpperCase() })}{' '}
            to {networkName}
          </span>

          {/* Addresses */}
          <div className="h-2" />
          <div className="flex flex-col font-light">
            <span className="flex flex-nowrap gap-1 text-sm text-blue-arbitrum lg:text-base">
              L1 transaction: <DepositL1TxStatus tx={tx} />
            </span>
            <span className="flex flex-nowrap gap-1 text-sm text-blue-arbitrum lg:text-base">
              L2 transaction: <DepositL2TxStatus tx={tx} />
            </span>
          </div>
        </div>

        <span className="absolute right-0 bottom-0 max-w-[100px] animate-pulse overflow-hidden text-ellipsis rounded-full bg-orange p-2 px-4 text-sm font-semibold text-blue-arbitrum lg:max-w-full lg:text-lg">
          <DepositCountdown
            createdAt={tx.createdAt}
            depositStatus={tx.depositStatus}
          />
        </span>
      </div>
    </DepositCardContainer>
  )
}
