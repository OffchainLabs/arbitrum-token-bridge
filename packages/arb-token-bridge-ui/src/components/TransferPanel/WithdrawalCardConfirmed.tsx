import { useMemo } from 'react'

import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { MergedTransaction } from '../../state/app/state'
import { WithdrawalCardContainer, WithdrawalL2TxStatus } from './WithdrawalCard'
import { useClaimWithdrawal } from '../../hooks/useClaimWithdrawal'
import { Button } from '../common/Button'
import { Tooltip } from '../common/Tooltip'

export function WithdrawalCardConfirmed({ tx }: { tx: MergedTransaction }) {
  const { isConnectedToArbitrum } = useNetworksAndSigners()
  const { claim, isClaiming } = useClaimWithdrawal()

  const isClaimButtonDisabled = useMemo(
    () =>
      typeof isConnectedToArbitrum !== 'undefined'
        ? isConnectedToArbitrum
        : true,
    [isConnectedToArbitrum]
  )

  return (
    <WithdrawalCardContainer tx={tx}>
      <div className="flex flex-row flex-wrap items-center justify-between">
        <div className="lg:ml-[4rem]">
          {/* Heading */}
          <span className="ml-[2rem] text-2xl text-blue-arbitrum lg:ml-0">
            Funds are ready to claim!
          </span>

          {/* Addresses */}
          <div className="h-2" />
          <div className="flex flex-col font-light">
            <span className="flex flex-nowrap gap-1 text-base text-blue-arbitrum">
              L2 transaction: <WithdrawalL2TxStatus tx={tx} />
            </span>
            <span className="text-base text-blue-arbitrum">
              L1 transaction: Will show after claiming
            </span>
          </div>
        </div>

        <Tooltip
          show={isClaimButtonDisabled}
          content={
            <span>
              Please connect to the L1 network to claim your withdrawal.
            </span>
          }
        >
          <Button
            variant="primary"
            loading={isClaiming}
            disabled={isClaimButtonDisabled}
            onClick={() => claim(tx)}
            className="my-4 text-lg"
          >
            Claim {tx.value} {tx.asset.toUpperCase()}
          </Button>
        </Tooltip>
      </div>
    </WithdrawalCardContainer>
  )
}
