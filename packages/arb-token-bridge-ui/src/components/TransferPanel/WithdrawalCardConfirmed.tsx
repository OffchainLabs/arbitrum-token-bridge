import { useMemo } from 'react'

import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { MergedTransaction } from '../../state/app/state'
import { WithdrawalCardContainer, WithdrawalL2TxStatus } from './WithdrawalCard'
import { useClaimWithdrawal } from '../../hooks/useClaimWithdrawal'
import { Tooltip } from '../common/Tooltip'

export function WithdrawalCardConfirmed({ tx }: { tx: MergedTransaction }) {
  const { isConnectedToArbitrum } = useNetworksAndSigners()
  const { claim } = useClaimWithdrawal()

  const isClaimButtonDisabled = useMemo(
    () =>
      typeof isConnectedToArbitrum !== 'undefined'
        ? isConnectedToArbitrum
        : true,
    [isConnectedToArbitrum]
  )

  return (
    <WithdrawalCardContainer tx={tx}>
      <span className="text-2xl text-v3-arbitrum-dark-blue">
        Funds are ready to claim!
      </span>

      <Tooltip
        show={isClaimButtonDisabled}
        content={
          <span>
            Please connect to the L1 network to claim your withdrawal.
          </span>
        }
      >
        <button
          className="arb-hover w-max rounded-lg bg-v3-dark px-4 py-3 text-2xl text-white disabled:bg-v3-gray-5"
          disabled={isClaimButtonDisabled}
          onClick={() => claim(tx)}
        >
          Claim {tx.value} {tx.asset.toUpperCase()}
        </button>
      </Tooltip>

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
