import { twMerge } from 'tailwind-merge'
import { useMemo } from 'react'
import { GET_HELP_LINK } from '../../constants'
import { useClaimWithdrawal } from '../../hooks/useClaimWithdrawal'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { DepositStatus, MergedTransaction } from '../../state/app/state'
import { useClaimCctp, useRemainingTime } from '../../state/cctpState'
import { shouldTrackAnalytics, trackEvent } from '../../util/AnalyticsUtils'
import { isUserRejectedError } from '../../util/isUserRejectedError'
import { getNetworkName } from '../../util/networks'
import { errorToast } from '../common/atoms/Toast'
import { Button } from '../common/Button'
import { Tooltip } from '../common/Tooltip'
import { useSwitchNetworkWithConfig } from '../../hooks/useSwitchNetworkWithConfig'
import { useNetwork } from 'wagmi'
import { isDepositReadyToRedeem } from '../../state/app/utils'
import { useIsConnectedToArbitrum } from '../../hooks/useIsConnectedToArbitrum'
import { useRedeemRetryable } from '../../hooks/useRedeemRetryable'
import { WithdrawalCountdown } from '../common/WithdrawalCountdown'
import { DepositCountdown } from '../common/DepositCountdown'

export function TransactionsTableRowAction({
  tx,
  isError,
  type
}: {
  tx: MergedTransaction
  isError: boolean
  type: 'deposits' | 'withdrawals'
}) {
  const { switchNetwork } = useSwitchNetworkWithConfig()
  const networkName = getNetworkName(
    type === 'deposits' ? tx.parentChainId : tx.childChainId
  )

  const { chain } = useNetwork()
  const { claim, isClaiming } = useClaimWithdrawal()
  const { claim: claimCctp, isClaiming: isClaimingCctp } = useClaimCctp(tx)
  const { isConfirmed } = useRemainingTime(tx)
  const isConnectedToArbitrum = useIsConnectedToArbitrum()
  const { redeem, isRedeeming } = useRedeemRetryable()
  const { remainingTime: cctpRemainingTime } = useRemainingTime(tx)

  const currentChainIsValid = useMemo(() => {
    if (!chain) {
      return false
    }
    if (type === 'deposits') {
      return chain.id === tx.childChainId
    }
    return chain.id === tx.parentChainId
  }, [type, chain, tx.parentChainId, tx.childChainId])

  const isClaimButtonDisabled = useMemo(() => {
    return isClaiming || isClaimingCctp || !isConfirmed
  }, [isClaiming, isClaimingCctp, isConfirmed])

  const isRedeemButtonDisabled = useMemo(
    () =>
      typeof isConnectedToArbitrum !== 'undefined'
        ? !isConnectedToArbitrum
        : true,
    [isConnectedToArbitrum]
  )

  const getHelpOnError = () => {
    window.open(GET_HELP_LINK, '_blank')

    // track the button click
    if (shouldTrackAnalytics(networkName)) {
      trackEvent('Tx Error: Get Help Click', { network: networkName })
    }
  }

  if (isDepositReadyToRedeem(tx)) {
    // Failed retryable
    return (
      <Tooltip
        show={isRedeemButtonDisabled}
        wrapperClassName=""
        content={
          <span>
            Please connect to {getNetworkName(tx.childChainId)} to re-execute
            your deposit. You have 7 days to re-execute a failed tx. After that,
            the tx is no longer recoverable.
          </span>
        }
      >
        <Button
          variant="primary"
          loading={isRedeeming}
          disabled={isRedeemButtonDisabled}
          onClick={() => redeem(tx)}
          className="w-16 rounded bg-red-400 p-2 text-xs"
        >
          Retry
        </Button>
      </Tooltip>
    )
  }

  if (
    tx.status === 'Unconfirmed' ||
    tx.depositStatus === DepositStatus.L1_PENDING ||
    tx.depositStatus === DepositStatus.L2_PENDING ||
    typeof cctpRemainingTime !== 'undefined'
  ) {
    return (
      <div className="flex flex-col text-center text-xs">
        <span>Time left:</span>
        {tx.isCctp && <>{cctpRemainingTime}</>}
        {!tx.isCctp &&
          (tx.isWithdrawal ? (
            <WithdrawalCountdown tx={tx} />
          ) : (
            <DepositCountdown tx={tx} />
          ))}
      </div>
    )
  }

  if (tx.status === 'Confirmed') {
    if (tx.isCctp && tx.resolvedAt) {
      return null
    }

    return (
      <Tooltip
        show={!currentChainIsValid}
        wrapperClassName=""
        content={
          <span>
            {`Please switch to ${getNetworkName(
              tx.isWithdrawal ? tx.parentChainId : tx.childChainId
            )} to claim your ${tx.isWithdrawal ? 'withdrawal' : 'deposit'}.`}
          </span>
        }
      >
        <Button
          variant="primary"
          loading={isClaiming || isClaimingCctp}
          disabled={isClaimButtonDisabled}
          className={twMerge(
            'w-16 rounded p-2 text-xs text-black',
            currentChainIsValid ? 'bg-green-400' : 'bg-white'
          )}
          onClick={async () => {
            try {
              if (!currentChainIsValid) {
                return switchNetwork?.(
                  tx.isWithdrawal ? tx.parentChainId : tx.childChainId
                )
              }
              if (tx.isCctp) {
                return await claimCctp()
              } else {
                return await claim(tx)
              }
            } catch (error: any) {
              if (isUserRejectedError(error)) {
                return
              }

              errorToast(
                `Can't claim ${
                  type === 'deposits' ? 'withdrawal' : 'deposit'
                }: ${error?.message ?? error}`
              )
            }
          }}
        >
          {currentChainIsValid ? 'Claim' : 'Switch'}
        </Button>
      </Tooltip>
    )
  }

  if (isError) {
    return (
      <Button
        variant="primary"
        className="rounded bg-white p-2 text-xs text-black"
        onClick={getHelpOnError}
      >
        Get help
      </Button>
    )
  }

  return null
}
