import { useCallback, useEffect, useMemo, useState } from 'react'

import { MergedTransaction } from '../../state/app/state'
import { L1TransactionReceipt } from '@arbitrum/sdk'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { useRedeemRetryable } from '../../hooks/useRedeemRetryable'
import { DepositCardContainer, DepositL1TxStatus } from './DepositCard'
import { Tooltip } from '../common/Tooltip'
import { Button } from '../common/Button'
import dayjs from 'dayjs'

export function DepositCardL2Failure({ tx }: { tx: MergedTransaction }) {
  const [retryableExpiryDays, setRetryableExpiryDays] = useState<number>(0)
  const {
    isConnectedToArbitrum,
    l1: { signer: l1Signer },
    l2: { signer: l2Signer }
  } = useNetworksAndSigners()

  const { redeem, isRedeeming } = useRedeemRetryable()


  const isRedeemButtonDisabled = useMemo(
    () =>
      typeof isConnectedToArbitrum !== 'undefined'
        ? !isConnectedToArbitrum
        : true,
    [isConnectedToArbitrum]
  )

  const getRetryableExpiryDays = useCallback(async () => {
    let daysTillExpiry: number = 0
    try {
      const depositTxReceipt = await l1Signer.provider.getTransactionReceipt(
        tx.txId
      )
      const l1TxReceipt = new L1TransactionReceipt(depositTxReceipt)
      const l1ToL2Msg = await l1TxReceipt.getL1ToL2Message(l2Signer.provider)

      const now = dayjs()
      const expiryDate = await l1ToL2Msg.getTimeout()

      daysTillExpiry = dayjs(+expiryDate.toString() * 1000).diff(now, 'days')
    } catch {
      daysTillExpiry = 0
    }

    return daysTillExpiry
  }, [l1Signer, l2Signer])

  useEffect(() => {
    ;(async () => {
      const daysTillExpiry = await getRetryableExpiryDays()
      setRetryableExpiryDays(daysTillExpiry)
    })()
  }, [])

  return (
    <DepositCardContainer tx={tx}>
      <span className="text-4xl font-semibold text-brick-dark">
        {isRedeeming ? 'Re-executing...' : 'L2 transaction failed'}
      </span>

      <div className="h-1" />
      {retryableExpiryDays > 0 && (
        <span className="text-2xl font-normal text-brick-dark">
          You have ~{retryableExpiryDays} days to retry, so best to click the
          button now!
        </span>
      )}
      <div className="h-1" />

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
          Retry for free
        </Button>
      </Tooltip>

      <div className="h-2" />
      <div className="flex flex-col font-light">
        <span className="text-lg text-orange-dark">
          L1 transaction (Etherscan): <DepositL1TxStatus tx={tx} />
        </span>
        <span className="text-lg text-orange-dark">
          L2 transaction (Arbiscan):{' '}
          {isRedeeming ? 'Pending...' : 'Failed. Try re-executing.'}
        </span>
      </div>
    </DepositCardContainer>
  )
}
