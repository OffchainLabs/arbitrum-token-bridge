/*
  + We show this card when the L1 txn is completed, but L2 txn fails for some reason.
  + In that case, we give user an option to raise a Retryable ticket request (basically, retry that transaction)
  + This action is only limited to ~7 day window from the time of failure of the transaction.
    + The text for how many days remain is updated dynamically in the card using `retryableExpiryDays` state.
  + When the ~7 day window expires, we don't show this card, and move the transaction to `EXPIRED` state.
*/

import { useEffect, useMemo, useState, useCallback } from 'react'

import { MergedTransaction } from '../../state/app/state'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { useRedeemRetryable } from '../../hooks/useRedeemRetryable'
import { DepositCardContainer, DepositL1TxStatus } from './DepositCard'
import { Tooltip } from '../common/Tooltip'
import { Button } from '../common/Button'
import { getRetryableTicketExpiration } from '../../util/RetryableUtils'

export function DepositCardL2Failure({ tx }: { tx: MergedTransaction }) {
  const [retryableExpiryDays, setRetryableExpiryDays] = useState<{
    isValid: boolean // false, if the days are still loading, or ticket is expired or there was error in loading
    days: number
  }>({ isValid: false, days: 0 })

  const {
    isConnectedToArbitrum,
    l1: { provider: l1Provider },
    l2: { provider: l2Provider }
  } = useNetworksAndSigners()

  const { redeem, isRedeeming } = useRedeemRetryable()

  const isRedeemButtonDisabled = useMemo(
    () =>
      typeof isConnectedToArbitrum !== 'undefined'
        ? !isConnectedToArbitrum
        : true,
    [isConnectedToArbitrum]
  )

  const updateRetryableTicketExpirationDate =
    useCallback(async (): Promise<void> => {
      const { daysUntilExpired, isLoading, isLoadingError, isExpired } =
        await getRetryableTicketExpiration({
          l1TxHash: tx.txId,
          l1Provider,
          l2Provider
        })

      // update the state to show/hide text and the card
      setRetryableExpiryDays({
        days: daysUntilExpired,
        isValid: !(isLoading || isLoadingError || isExpired)
      })
    }, [tx.txId, l1Provider, l2Provider])

  useEffect(() => {
    updateRetryableTicketExpirationDate()
  }, [updateRetryableTicketExpirationDate])

  const retryableExpiryDaysText = useMemo((): string => {
    const remainingDays = retryableExpiryDays.days
    if (remainingDays < 1) {
      return 'less than a day'
    } else if (remainingDays > 1) {
      return `${remainingDays} days`
    } else {
      // case : remainingDays === 1
      return `${remainingDays} day`
    }
  }, [retryableExpiryDays.days])

  return (
    <>
      {/* Only show the CTA and `days remaining to retry..` modal if the remaining days are valid */}
      {retryableExpiryDays?.isValid && (
        <DepositCardContainer tx={tx}>
          <span className="text-4xl font-semibold text-orange-dark">
            {isRedeeming ? 'Re-executing...' : 'L2 transaction failed'}
          </span>

          <div className="h-1" />

          <span className="text-2xl font-normal text-orange-dark">
            {`No worries, we can try again. You have ${retryableExpiryDaysText} to re-execute.`}
          </span>

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
              Re-execute
            </Button>
          </Tooltip>

          <div className="h-2" />
          <div className="flex flex-col font-light">
            <span className="text-base text-orange-dark">
              L1 transaction: <DepositL1TxStatus tx={tx} />
            </span>
            <span className="text-base text-orange-dark">
              L2 transaction:{' '}
              {isRedeeming ? 'Pending...' : 'Failed. Try re-executing.'}
            </span>
          </div>
        </DepositCardContainer>
      )}
    </>
  )
}
