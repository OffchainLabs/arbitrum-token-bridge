import { useMemo } from 'react'

import { MergedTransaction } from '../../state/app/state'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { useRedeemRetryable } from '../../hooks/useRedeemRetryable'
import { DepositCardContainer, DepositL1TxStatus } from './DepositCard'
import { Tooltip } from '../common/Tooltip'
import { Button } from '../common/Button'

export function DepositCardL2Failure({ tx }: { tx: MergedTransaction }) {
  const { isConnectedToArbitrum } = useNetworksAndSigners()
  const { redeem, isRedeeming } = useRedeemRetryable()

  const isRedeemButtonDisabled = useMemo(
    () =>
      typeof isConnectedToArbitrum !== 'undefined'
        ? !isConnectedToArbitrum
        : true,
    [isConnectedToArbitrum]
  )

  return (
    <DepositCardContainer tx={tx}>
      <span className="text-4xl font-semibold text-orange-dark">
        {isRedeeming ? 'Re-executing...' : 'L2 transaction failed'}
      </span>
      <Tooltip
        show={isRedeemButtonDisabled}
        content={
          <span>
            Please connect to the L2 network to re-execute your deposit.
          </span>
        }
      >
        <Button
          variant="primary"
          loading={isRedeeming}
          disabled={isRedeemButtonDisabled}
          onClick={() => redeem(tx)}
          className="text-2xl"
        >
          Re-execute
        </Button>
      </Tooltip>

      <div className="h-2" />
      <div className="flex flex-col font-light">
        <span className="text-lg text-orange-dark">
          L1 transaction: <DepositL1TxStatus tx={tx} />
        </span>
        <span className="text-lg text-orange-dark">
          L2 transaction:{' '}
          {isRedeeming ? 'Pending...' : 'Failed. Try re-executing.'}
        </span>
      </div>
    </DepositCardContainer>
  )
}
