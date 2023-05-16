import { getNetworkName } from '../../util/networks'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { MergedTransaction } from '../../state/app/state'
import { WithdrawalCountdown } from '../common/WithdrawalCountdown'
import { WithdrawalCardContainer, WithdrawalL2TxStatus } from './WithdrawalCard'
import { Button } from '../common/Button'
import { Tooltip } from '../common/Tooltip'
import { formatAmount } from '../../util/NumberUtils'

export function WithdrawalCardUnconfirmed({ tx }: { tx: MergedTransaction }) {
  const { l1 } = useNetworksAndSigners()
  const networkName = getNetworkName(l1.network.chainID)

  return (
    <WithdrawalCardContainer tx={tx}>
      <div className="flex flex-row flex-wrap items-center justify-between">
        <div className="flex flex-col lg:ml-[-2rem]">
          <span className="ml-8 text-lg text-blue-arbitrum lg:ml-0 lg:text-2xl">
            Moving{' '}
            {formatAmount(Number(tx.value), { symbol: tx.asset.toUpperCase() })}{' '}
            to {networkName}
          </span>

          <span className="animate-pulse text-sm text-gray-10">
            {tx.nodeBlockDeadline ? (
              <WithdrawalCountdown nodeBlockDeadline={tx.nodeBlockDeadline} />
            ) : (
              <span>Calculating...</span>
            )}
          </span>

          <div className="h-2" />
          <div className="flex flex-col font-light">
            <span className="flex flex-nowrap gap-1 text-sm text-blue-arbitrum lg:text-base">
              L2 transaction: <WithdrawalL2TxStatus tx={tx} />
            </span>
            <span className="flex flex-nowrap gap-1 text-sm text-blue-arbitrum lg:text-base">
              L1 transaction: Will show after claiming
            </span>
          </div>
        </div>

        <Tooltip content={<span>Funds aren&apos;t ready to claim yet</span>}>
          <Button
            variant="primary"
            className="absolute bottom-0 right-0 text-sm lg:my-4 lg:text-lg"
            disabled
          >
            <div className="flex flex-nowrap whitespace-pre">
              Claim{' '}
              <span className="hidden lg:flex">
                {formatAmount(Number(tx.value), {
                  symbol: tx.asset.toUpperCase()
                })}
              </span>
            </div>
          </Button>
        </Tooltip>
      </div>
    </WithdrawalCardContainer>
  )
}
